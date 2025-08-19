import { GET as diagGET } from '../../src/app/api/plans_v2/diag/route';

async function main() {
  const res = await diagGET();
  const json = await res.json();
  console.log('aliases', json.categoryAliases);
  const eduCO = (json.countsByCountryCategory || []).find((r: any) => r.country === 'CO' && r.category === 'educativa');
  console.log('educativa_CO', eduCO);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});


