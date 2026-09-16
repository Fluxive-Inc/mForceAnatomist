// ⚠ VENDORED — DO NOT EDIT HERE.
// Source of truth: .mforce/lib/fleet-scope/fleet-scope.js   ·   change it there, then run ./sync-modules.sh
// Synced: 2026-09-15T23:21:36Z
// fleet-scope.js — uniform fleet_ops scope resolver (zero-dependency, additive).
// Part of the OS->all-systems fleet_ops handoff. The mForceLaunch Fleet Navigator
// sets the active fleet UUID in the `mforce_active_org` cookie on .fluxive.ai. This
// middleware turns that into req.fleetScope so every system scopes content the same:
//   { fleetId, operatorId, operatorFilter, OPERATOR_FLEET_ID, sql(alias, idx) }
// operatorFilter === true  => active fleet is the shared "My Machineforce" operator
// fleet -> scope to the operator (operator_id), NOT an org. Else scope by fleet_id.
// It only SETS req.fleetScope; it never blocks a request.
// See fluxive-vision/protocols/mForceOS1_fleet-ops-protocol.md.
'use strict';
const OPERATOR_FLEET_ID = '00000000-0000-4000-8000-000000000001';
function _parse(h){var o={};String(h||'').split(';').forEach(function(p){var i=p.indexOf('=');if(i<0)return;o[p.slice(0,i).trim()]=decodeURIComponent(p.slice(i+1).trim());});return o;}
function fleetScope(req,res,next){
  try{
    var c=(req.cookies&&Object.keys(req.cookies).length)?req.cookies:_parse(req.headers&&req.headers.cookie);
    var fleetId=(req.query&&req.query.fleetId)||(req.headers&&req.headers['x-mforce-fleet'])||c['mforce_active_org']||null;
    var operatorId=(req.authenticatedUser&&(req.authenticatedUser.operatorId||req.authenticatedUser.operator_id))||(req.headers&&req.headers['x-mforce-operator'])||c['mforce_operator_id']||null;
    var operatorFilter=String(fleetId)===OPERATOR_FLEET_ID;
    // orgRequired: no fleet at all, or the shared operator fleet is active. Bridge (an
    // org-only environment) uses this to FAIL CLOSED instead of serving operator data.
    var orgRequired=(!fleetId)||operatorFilter;
    req.fleetScope={
      fleetId:fleetId, operatorId:operatorId, operatorFilter:operatorFilter, orgRequired:orgRequired, OPERATOR_FLEET_ID:OPERATOR_FLEET_ID,
      // Parameterized scope predicate for a fleet-scoped content table.
      // operator fleet -> operator_id; org fleet -> fleet_id. Returns {text, value}.
      sql:function(alias,idx){var a=alias?alias+'.':'';var n=idx||1;
        return operatorFilter?{text:a+'operator_id = $'+n,value:operatorId}:{text:a+'fleet_id = $'+n,value:fleetId};}
    };
  }catch(e){req.fleetScope={fleetId:null,operatorId:null,operatorFilter:false,orgRequired:true,OPERATOR_FLEET_ID:OPERATOR_FLEET_ID,sql:function(){return{text:'1=0',value:null};}};}
  next();
}
fleetScope.OPERATOR_FLEET_ID=OPERATOR_FLEET_ID;
module.exports=fleetScope;
