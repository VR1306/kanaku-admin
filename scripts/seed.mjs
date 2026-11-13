#!/usr/bin/env node
// Idempotent bootstrap for an empty database. Run with:  npm run seed            (first Super Admin + starter config)
//                                                         npm run seed -- --demo  (also inserts sample users/payments/coupons)
// Reads MONGODB_URI / MONGODB_DB from the environment (npm script loads .env.local). Never overwrites existing records.
import { randomBytes, scryptSync } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { MongoClient } from 'mongodb';

const uri = process.env.MONGODB_URI;
if (!uri) throw new Error('MONGODB_URI is not set');
const demo = process.argv.includes('--demo');
const client = await new MongoClient(uri, { serverSelectionTimeoutMS: 15000 })
  .connect()
  .catch((e) => {
    console.error(`\n✖ Could not connect to MongoDB (${e.name}).`);
    console.error(
      /auth/i.test(e.message)
        ? '  The database rejected the login: check the username/password in MONGODB_URI (URL-encode special characters).'
        : '  In Atlas allow 0.0.0.0/0 under Network Access, make sure the cluster is not paused, and check MONGODB_URI.',
    );
    process.exit(1);
  });
const db = client.db(process.env.MONGODB_DB ?? 'kanaku_admin');
console.log(
  `Seeding database "${db.databaseName}" on ${(uri.match(/@([^/?]+)/) ?? [])[1] ?? 'unknown host'}`,
);
const insertOnce = (name, docs) =>
  Promise.all(
    docs.map(({ _id, ...rest }) =>
      db.collection(name).updateOne({ _id }, { $setOnInsert: rest }, { upsert: true }),
    ),
  );

const B32 = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
const secret = () => Array.from(randomBytes(32), (b) => B32[b % 32]).join('');
const hashPw = (pw) => {
  const s = randomBytes(16);
  return `${s.toString('hex')}:${scryptSync(pw, s, 32).toString('hex')}`;
};

// 1. First Super Admin — must change the password and enrol MFA at first sign-in.
const email = (process.env.SEED_ADMIN_EMAIL ?? '').toLowerCase();
const password = process.env.SEED_ADMIN_PASSWORD;
if (email && password) {
  await db.collection('admins').createIndex({ email: 1 }, { unique: true });
  if (!(await db.collection('admins').findOne({ email }))) {
    await db.collection('admins').insertOne({
      _id: 'adm_' + randomBytes(5).toString('hex'),
      name: process.env.SEED_ADMIN_NAME ?? 'Super Admin',
      email,
      role: 'super_admin',
      status: 'active',
      pw: hashPw(password),
      mustChange: true,
      totpSecret: secret(),
      mfaEnrolled: false,
      backup: [],
      failed: 0,
      lockedUntil: 0,
      lastActive: new Date().toISOString(),
    });
    console.log(
      `Created Super Admin ${email} (password change + MFA setup required at first sign-in)`,
    );
  } else console.log(`Super Admin ${email} already exists`);
} else
  console.log('Skipped Super Admin (set SEED_ADMIN_EMAIL and SEED_ADMIN_PASSWORD to create one)');

// 1b. Optional time-boxed TEST Super Admin that can sign in without MFA (for first-time setup/testing only).
//     Needs SEED_TEST_ADMIN_EMAIL + SEED_TEST_ADMIN_PASSWORD. It expires by itself after SEED_TEST_ADMIN_DAYS (default 2,
//     max 7) and only skips MFA while the app has ALLOW_MFA_EXEMPT=true. Delete it from Team & roles once a real admin exists.
const testEmail = (process.env.SEED_TEST_ADMIN_EMAIL ?? '').toLowerCase();
const testPassword = process.env.SEED_TEST_ADMIN_PASSWORD;
if (testEmail && testPassword) {
  const days = Math.min(7, Math.max(1, Number(process.env.SEED_TEST_ADMIN_DAYS ?? 2) || 2));
  const until = new Date(Date.now() + days * 86_400_000).toISOString();
  const existing = await db.collection('admins').findOne({ email: testEmail });
  if (!existing) {
    await db.collection('admins').insertOne({
      _id: 'adm_' + randomBytes(5).toString('hex'),
      name: 'Test Super Admin',
      email: testEmail,
      role: 'super_admin',
      status: 'active',
      pw: hashPw(testPassword),
      mustChange: false,
      totpSecret: secret(),
      mfaEnrolled: false,
      backup: [],
      failed: 0,
      lockedUntil: 0,
      mfaExempt: true,
      accessExpires: until,
      lastActive: new Date().toISOString(),
    });
    console.log(`Created TEST Super Admin ${testEmail}: no MFA, expires ${until}`);
  } else {
    await db
      .collection('admins')
      .updateOne(
        { email: testEmail },
        { $set: { mfaExempt: true, accessExpires: until, failed: 0, lockedUntil: 0 } },
      );
    console.log(
      `TEST Super Admin ${testEmail} already existed: access window renewed until ${until}`,
    );
  }
}

// 2. Starter plans and default categories (product configuration, editable in the console afterwards).
const PRO_MONTHLY = 199,
  GST = 18,
  PRO_YEARLY = Math.round(PRO_MONTHLY * 12 * 0.8);
await insertOnce('plans', [
  {
    _id: 'plan_starter',
    name: 'Starter',
    description: 'Free forever',
    badge: '',
    visible: true,
    monthly: 0,
    yearly: 0,
    gstPct: GST,
    gstMode: 'exclusive',
    subscribers: 0,
    version: 1,
    status: 'live',
  },
  {
    _id: 'plan_pro',
    name: 'Pro',
    description: 'Everything you need to master your money',
    badge: 'Most popular',
    visible: true,
    monthly: PRO_MONTHLY,
    yearly: PRO_YEARLY,
    gstPct: GST,
    gstMode: 'exclusive',
    subscribers: 0,
    version: 1,
    status: 'live',
  },
]);
// Plan access (which User App modules each plan includes). Only fills plans that don't have it yet; edit in the console.
const ALL = [
  'dashboard',
  'transactions',
  'budgets',
  'reports',
  'recurring',
  'categories',
  'notifications',
  'exports',
];
await db
  .collection('plans')
  .updateOne(
    { _id: 'plan_starter', modules: { $exists: false } },
    { $set: { modules: ALL.filter((m) => m !== 'recurring' && m !== 'exports'), maxBudgets: 5 } },
  );
await db
  .collection('plans')
  .updateOne(
    { _id: 'plan_pro', modules: { $exists: false } },
    { $set: { modules: ALL, maxBudgets: null } },
  );
const cats = [
  ['Food & dining', 'food', 'cyan', 'expense', 'Meals, groceries and delivery'],
  ['Rent', 'home', 'blue', 'expense', 'Monthly rent and housing'],
  ['Transport', 'car', 'rose', 'expense', 'Cabs, fuel, metro and parking'],
  ['Shopping', 'bag', 'green', 'expense', 'Clothes, gadgets and household'],
  ['Bills & utilities', 'bolt', 'violet', 'expense', 'Electricity, internet and subscriptions'],
  ['Health', 'heart', 'green', 'expense', 'Doctor, pharmacy and fitness'],
  ['Entertainment', 'film', 'blue', 'expense', 'Movies, streaming and outings'],
  ['Education', 'book', 'amber', 'expense', 'Courses, books and fees'],
  ['Travel', 'plane', 'cyan', 'expense', 'Trips, hotels and tickets'],
  ['Gifts', 'gift', 'rose', 'expense', 'Presents and celebrations'],
  ['Investments', 'trend', 'violet', 'expense', 'SIPs, stocks and savings'],
  ['Pets', 'paw', 'slate', 'expense', 'Food, vet and supplies'],
  ['Salary', 'wallet', 'blue', 'income', 'Monthly salary credits'],
  ['Freelance', 'coffee', 'cyan', 'income', 'Side work and projects'],
  ['Interest', 'trend', 'green', 'income', 'Savings and deposit interest'],
];
await insertOnce(
  'categories',
  cats.map(([name, icon, color, kind, description], i) => ({
    _id: `cat_${i + 1}`,
    name,
    users: 0,
    enabled: true,
    color,
    kind,
    icon,
    description,
    builtin: true,
  })),
);
console.log('Starter plans and default categories ensured');

// 3. Optional sample data for demos and screenshots.
if (demo) {
  const day = (n) => new Date(Date.now() - n * 86400_000).toISOString();
  const users = [
    ['Arjun Nair', 'arjun.nair@example.com', 'pro_monthly', 'active', 60],
    ['Sneha Kapoor', 'sneha.k@example.com', 'starter', 'active', 40],
    ['Vikram Joshi', 'vikram.joshi@example.com', 'pro_yearly', 'active', 200],
    ['Lakshmi Rao', 'lakshmi.rao@example.com', 'starter', 'invited', 3],
    ['Rahul Mehta', 'rahul.m@example.com', 'pro_monthly', 'suspended', 150],
    ['Divya Pillai', 'divya.pillai@example.com', 'starter', 'inactive', 280],
  ].map(([name, mail, plan, status, age], i) => ({
    _id: `usr_demo${i + 1}`,
    name,
    email: mail,
    phone: '',
    plan,
    status,
    lastActive: status === 'invited' ? '' : day(1),
    joined: day(age).slice(0, 10),
    mfa: status === 'active',
    location: '',
    renewsOn: plan === 'starter' ? null : day(-20).slice(0, 10),
    lastPasswordChange: null,
  }));
  await insertOnce('app_users', users);
  const gross = (p) => Math.round(p * (1 + GST / 100) * 100) / 100;
  await insertOnce(
    'payments',
    [
      ['pay_demo1', 'usr_demo3', 'Vikram Joshi', 'Pro yearly', 'UPI', 1, 'paid', PRO_YEARLY],
      [
        'pay_demo2',
        'usr_demo1',
        'Arjun Nair',
        'Pro monthly',
        'Card ••42',
        2,
        'failed',
        PRO_MONTHLY,
      ],
      [
        'pay_demo3',
        'usr_demo5',
        'Rahul Mehta',
        'Pro monthly',
        'Card ••07',
        9,
        'refunded',
        PRO_MONTHLY,
      ],
    ].map(([_id, userId, user, plan, method, age, status, base]) => ({
      _id,
      userId,
      user,
      plan,
      method,
      at: day(age),
      status,
      amount: gross(base),
    })),
  );
  await insertOnce('coupons', [
    {
      _id: 'cp_demo1',
      code: 'WELCOME100',
      type: 'fixed',
      value: 100,
      plans: ['Pro monthly'],
      duration: 'once',
      from: '2026-01-01',
      until: '2026-12-31',
      maxRedemptions: null,
      perUser: 1,
      redeemed: 0,
      active: true,
    },
  ]);
  console.log('Sample users, payments and coupon inserted');
}
// 3. Landing page: starting content (published v1 + editable draft) and structural extras.
const baseline = JSON.parse(
  readFileSync(new URL('./landing-baseline.json', import.meta.url), 'utf8'),
);
await insertOnce('cms', [{ _id: 'draft', config: baseline.cms, dirty: false }]);
if (!(await db.collection('cms_versions').countDocuments({}, { limit: 1 })))
  await db.collection('cms_versions').insertOne({
    version: 1,
    publishedAt: new Date().toISOString(),
    by: 'system seed',
    config: baseline.cms,
  });
await insertOnce('cms_extras', [{ _id: 'landing', config: baseline.extras }]);
console.log('Landing page baseline ready');

// 4. Legal documents: the current Privacy Policy and Terms, published as v1 (edit + republish in the console).
const legal = JSON.parse(readFileSync(new URL('./legal-baseline.json', import.meta.url), 'utf8'));
for (const [slug, doc] of Object.entries(legal)) {
  const { updated, ...content } = doc; // the "updated" date is the publish date, not stored text
  void updated;
  await db.collection('legal').updateOne(
    { _id: slug },
    {
      $setOnInsert: {
        draft: content,
        dirty: false,
        versions: [
          { version: 1, publishedAt: new Date().toISOString(), by: 'system seed', content },
        ],
      },
    },
    { upsert: true },
  );
}
console.log('Legal documents ready');
await client.close();
