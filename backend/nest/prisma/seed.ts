/**
 * Seeds a fixed workspace for local development. Safe to re-run: it is keyed on
 * the developer account's email and replaces that workspace's customers.
 *
 * The public demo does not use this — each visitor gets a throwaway workspace
 * from `POST /api/demo/session` instead. See src/demo/demo.service.ts.
 */
import { PrismaClient, Prisma } from '@prisma/client';
import * as bcrypt from 'bcryptjs';
import {
  DEMO_ORGANIZATION_NAME,
  DEMO_OWNER_NAME,
  buildDemoCustomerRows,
} from '../src/demo/demo-dataset';

const prisma = new PrismaClient();

const DEV_EMAIL = 'demo@orbitcrm.app';
const DEV_PASSWORD = 'demo1234';

async function main(): Promise<void> {
  const passwordHash = await bcrypt.hash(DEV_PASSWORD, 10);

  const user = await prisma.user.upsert({
    where: { email: DEV_EMAIL },
    update: { passwordHash },
    create: {
      email: DEV_EMAIL,
      name: DEMO_OWNER_NAME,
      passwordHash,
      organization: { create: { name: DEMO_ORGANIZATION_NAME } },
    },
    include: { organization: true },
  });

  await prisma.customer.deleteMany({ where: { organizationId: user.organizationId } });

  await prisma.customer.createMany({
    data: buildDemoCustomerRows(user.organizationId).map((row) => ({
      ...row,
      value: new Prisma.Decimal(row.value),
    })),
  });

  const total = await prisma.customer.count({ where: { organizationId: user.organizationId } });
  console.log(`Seeded "${user.organization.name}" with ${total} customers.`);
  console.log(`Sign in with ${DEV_EMAIL} / ${DEV_PASSWORD}`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
