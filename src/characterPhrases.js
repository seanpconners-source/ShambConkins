const {characterIdentity}=require("src/characters.js");
const {quoteOf}=require("src/data/characterQuotes.js");
function characterPhrase(id){return quoteOf(id)||quoteOf(characterIdentity(id))||'';}

Object.assign(exports,{characterPhrase});