// Characters that were in the game twice (or three times) under different ids. Each extra copy now points to the one we
// keep: it is left out of the catalog, saves that unlocked it get the kept one, and any old reference resolves to it.
// Kept = the copy with the owner's portrait, else the richer record (actor, perk, pack landmark).
const MERGED_CHARACTERS=Object.freeze({
 'michael-scott':'michael','dwight-schrute':'dwight','t-800':'terminator','t800':'terminator','doc-brown':'docbrown',
 'marty-mcfly':'marty','alan-grant':'grant','austin-powers':'austin','forrest-review':'forrest','forrest-macneil':'forrest',
 'ace-ventura':'ace','john-rambo':'rambo','jay-mewes':'jay','silent-bob':'silentbob','m':'bond-m','q':'bond-q','jaws':'bond-jaws',
 'marge':'marge-gunderson','anton':'chigurh','plainview':'daniel-plainview','dirk':'dirk-diggler','reynolds':'reynolds-woodcock',
 'lancaster':'lancaster-dodd','steveo':'steve-o','weeman':'wee-man','ajax':'ajax-warriors','hector':'hector-troy','paris':'paris-troy',
 'tess':'tess-barbarian','the-mother':'mother-barbarian','tommy-callahan':'cf-tommy-callahan','george-costanza-v13':'george-costanza',
 'ref-django':'dj-django','ref-drkingschultz':'dj-king-schultz','ref-kitana':'mk-kitana','ref-mileena':'mk-mileena','ref-jax':'mk-jax',
 'ref-kano':'mk-kano','ref-shangtsung':'mk-shang-tsung','ref-reptile':'mk-reptile','ref-shaokahn':'mk-shao-kahn','ref-kunglao':'mk-kung-lao',
 'ref-baraka':'mk-baraka','ref-ermac':'mk-ermac','ref-noobsaibot':'mk-noob-saibot'
});
const mergedCharacterId=id=>typeof id==='string'&&Object.prototype.hasOwnProperty.call(MERGED_CHARACTERS,id)?MERGED_CHARACTERS[id]:id;
Object.assign(exports,{MERGED_CHARACTERS,mergedCharacterId});
