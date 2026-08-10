/**
 * The workspace contents handed to every demo visitor, and to `pnpm seed` for
 * local development. `monthsAgo` counts back from the current month so the
 * revenue chart always covers the trailing year, whenever it is generated.
 */
export interface DemoCustomer {
  name: string;
  company: string;
  status: string;
  value: number;
  monthsAgo: number;
}

export const DEMO_ORGANIZATION_NAME = 'Acme Studio';
export const DEMO_OWNER_NAME = 'Alex Morgan';

export const DEMO_CUSTOMERS: DemoCustomer[] = [
  { name: 'Olivia Martin', company: 'Northstar Labs', status: 'ACTIVE', value: 18400, monthsAgo: 0 },
  { name: 'Jackson Lee', company: 'Vertex Health', status: 'LEAD', value: 12600, monthsAgo: 0 },
  { name: 'Sophia Turner', company: 'Halo Commerce', status: 'ACTIVE', value: 24200, monthsAgo: 0 },
  { name: 'Ethan Wright', company: 'Form & Field', status: 'AT_RISK', value: 7800, monthsAgo: 1 },
  { name: 'Mia Chen', company: 'Sora Finance', status: 'LEAD', value: 9600, monthsAgo: 1 },
  { name: 'Noah Patel', company: 'Cobalt Systems', status: 'ACTIVE', value: 31500, monthsAgo: 1 },
  { name: 'Ava Rodriguez', company: 'Meridian Group', status: 'ACTIVE', value: 15200, monthsAgo: 2 },
  { name: 'Liam Novak', company: 'Basalt Ventures', status: 'LEAD', value: 6400, monthsAgo: 2 },
  { name: 'Isabella Rossi', company: 'Lumen Studio', status: 'ACTIVE', value: 21800, monthsAgo: 3 },
  { name: 'Mason Clarke', company: 'Ridgeline Co.', status: 'AT_RISK', value: 5200, monthsAgo: 3 },
  { name: 'Charlotte Kim', company: 'Petal & Stone', status: 'ACTIVE', value: 19600, monthsAgo: 3 },
  { name: 'Elijah Brooks', company: 'Foundry Works', status: 'LEAD', value: 11300, monthsAgo: 4 },
  { name: 'Amelia Novak', company: 'Tidal Analytics', status: 'ACTIVE', value: 27400, monthsAgo: 4 },
  { name: 'James Okafor', company: 'Beacon Legal', status: 'ACTIVE', value: 16900, monthsAgo: 5 },
  { name: 'Harper Singh', company: 'Juniper Retail', status: 'AT_RISK', value: 4800, monthsAgo: 5 },
  { name: 'Benjamin Cruz', company: 'Arcadia Media', status: 'LEAD', value: 8700, monthsAgo: 6 },
  { name: 'Evelyn Fischer', company: 'Copperline', status: 'ACTIVE', value: 22300, monthsAgo: 6 },
  { name: 'Lucas Meyer', company: 'Waypoint Travel', status: 'ACTIVE', value: 13800, monthsAgo: 7 },
  { name: 'Abigail Stone', company: 'Kestrel Design', status: 'LEAD', value: 7100, monthsAgo: 7 },
  { name: 'Henry Delgado', company: 'Silverbirch', status: 'ACTIVE', value: 25600, monthsAgo: 8 },
  { name: 'Emily Nakamura', company: 'Orchard Foods', status: 'AT_RISK', value: 6300, monthsAgo: 8 },
  { name: 'Alexander Reid', company: 'Pinnacle Build', status: 'ACTIVE', value: 34100, monthsAgo: 9 },
  { name: 'Scarlett Dubois', company: 'Verdant Home', status: 'LEAD', value: 10400, monthsAgo: 9 },
  { name: 'Daniel Ibrahim', company: 'Quarry Logistics', status: 'ACTIVE', value: 17700, monthsAgo: 10 },
  { name: 'Grace Lindqvist', company: 'Aster Clinic', status: 'ACTIVE', value: 20500, monthsAgo: 10 },
  { name: 'Sebastian Vance', company: 'Ironwood Capital', status: 'AT_RISK', value: 9200, monthsAgo: 11 },
  { name: 'Chloe Bennett', company: 'Sable Interiors', status: 'ACTIVE', value: 14600, monthsAgo: 11 },
  { name: 'Owen Marchetti', company: 'Drift Athletics', status: 'LEAD', value: 5900, monthsAgo: 11 },
];

/** Rows ready for `createMany`, dated relative to the moment they are generated. */
export function buildDemoCustomerRows(organizationId: string, now = new Date()) {
  return DEMO_CUSTOMERS.map((customer) => {
    // Day 12 keeps every row safely inside its own month regardless of month
    // length or the day the workspace happens to be created.
    const createdAt = new Date(
      Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - customer.monthsAgo, 12, 9, 30),
    );

    return {
      organizationId,
      name: customer.name,
      company: customer.company,
      email: `${customer.name.split(' ')[0].toLowerCase()}@${slug(customer.company)}.example`,
      status: customer.status,
      value: customer.value,
      lastContact: new Date(Date.UTC(createdAt.getUTCFullYear(), createdAt.getUTCMonth(), 12)),
      createdAt,
    };
  });
}

function slug(company: string): string {
  return company.toLowerCase().replace(/[^a-z0-9]+/g, '');
}
