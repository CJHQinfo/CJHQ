export function makeSuite(name){
  const rows = [];
  let pass = 0, fail = 0;
  const t = {
    name,
    check(label, cond, detail){
      if(cond){ pass++; rows.push(['PASS', label, '']); }
      else { fail++; rows.push(['FAIL', label, detail == null ? '' : String(detail).slice(0,200)]); }
      return !!cond;
    },
    eq(label, got, want){ return t.check(label, Object.is(got, want), 'got ' + JSON.stringify(got) + ' want ' + JSON.stringify(want)); },
    report(){
      const bad = rows.filter(r => r[0] === 'FAIL');
      console.log('\n=== ' + name + ' === ' + pass + ' passed, ' + fail + ' failed');
      bad.forEach(r => console.log('  FAIL  ' + r[1] + (r[2] ? '  |  ' + r[2] : '')));
      return { name, pass, fail };
    }
  };
  return t;
}
export function urlsIn(s){ return (String(s||'').match(/https?:\/\/[^\s<>")']+/g) || []).map(u=>u.replace(/[.,;:)]+$/,'')); }
