const {baccaratValue:cardBaccaratValue, baccaratDeal:cardBaccaratDeal, baccaratPayout:cardBaccaratPayout}=require("src/engines/casinoCards.js");
const {playBaccarat}=require("src/engines/casinoBaccarat.js");
const baccaratValue=cardBaccaratValue;
const baccaratDeal=cardBaccaratDeal;
const baccaratPayout=cardBaccaratPayout;
const baccarat=playBaccarat;

Object.assign(exports,{baccaratValue,baccaratDeal,baccaratPayout,baccarat});