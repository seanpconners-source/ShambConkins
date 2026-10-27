// Cloudflare analytics for the online rooms (used by .github/workflows/net-probe.yml): Durable Object and Worker
// traffic by hour, and — if the token may read the zone — what the edge did with /room requests (status codes, firewall
// / bot challenges). Env: CLOUDFLARE_API_TOKEN, CLOUDFLARE_ACCOUNT_ID; arg: hours back (default 30).
const TOKEN=process.env.CLOUDFLARE_API_TOKEN,ACC=process.env.CLOUDFLARE_ACCOUNT_ID,HOURS=+(process.argv[2]||30);
const since=new Date(Date.now()-HOURS*3600e3).toISOString(),until=new Date().toISOString();
const H={Authorization:`Bearer ${TOKEN}`,'Content-Type':'application/json'};
async function gql(query,variables){const r=await fetch('https://api.cloudflare.com/client/v4/graphql',{method:'POST',headers:H,body:JSON.stringify({query,variables})});return r.json();}
const show=(title,j)=>{console.log('--- '+title);if(j.errors?.length){console.log('  errors:',JSON.stringify(j.errors).slice(0,400));return;}console.log(JSON.stringify(j.data,null,0).slice(0,6000));};
const acc=body=>gql(`query($acc:String!,$since:Time!,$until:Time!){viewer{accounts(filter:{accountTag:$acc}){${body}}}}`,{acc:ACC,since,until});
show('Durable Object invocations by hour/status',await acc('durableObjectsInvocationsAdaptiveGroups(limit:500,filter:{datetime_geq:$since,datetime_leq:$until},orderBy:[datetimeHour_ASC]){sum{requests errors} dimensions{datetimeHour status}}'));
show('Worker invocations by hour/status',await acc('workersInvocationsAdaptive(limit:500,filter:{datetime_geq:$since,datetime_leq:$until,scriptName:"shambconkins"},orderBy:[datetimeHour_ASC]){sum{requests errors} dimensions{datetimeHour status}}'));
// zone level: needs Zone read + Analytics read on the token
const z=await (await fetch('https://api.cloudflare.com/client/v4/zones?name=loki-mylo.work',{headers:H})).json();
const zone=z.result?.[0]?.id;console.log('--- zone',zone||('not readable: '+JSON.stringify(z.errors||z).slice(0,300)));
if(zone){
 const zq=body=>gql(`query($zone:String!,$since:Time!,$until:Time!){viewer{zones(filter:{zoneTag:$zone}){${body}}}}`,{zone,since,until});
 show('/room requests at the edge by status',await zq('httpRequestsAdaptiveGroups(limit:200,filter:{datetime_geq:$since,datetime_leq:$until,clientRequestPath_like:"/room/%"},orderBy:[count_DESC]){count dimensions{edgeResponseStatus clientRequestHTTPHost userAgentBrowser securityAction securitySource}}'));
 show('firewall / security events',await zq('firewallEventsAdaptive(limit:100,filter:{datetime_geq:$since,datetime_leq:$until},orderBy:[datetime_DESC]){action source ruleId clientRequestPath clientRequestHTTPHost userAgent datetime edgeResponseStatus}'));
 const st=await (await fetch(`https://api.cloudflare.com/client/v4/zones/${zone}/settings/security_level`,{headers:H})).json();console.log('--- security level',JSON.stringify(st.result||st.errors));
 const bm=await (await fetch(`https://api.cloudflare.com/client/v4/zones/${zone}/bot_management`,{headers:H})).json();console.log('--- bot management',JSON.stringify(bm.result||bm.errors).slice(0,400));
}
