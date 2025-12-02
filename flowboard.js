var FlexiDialog={scriptsLoaded:!1,escDisabled:!1,currentLocation:null,htmlEditorFields:[],defaultEditorWidth:500,defaultEditorHeight:200,loadScript:function(e,t,i){return new Promise(((n,l)=>{let a=document.getElementById(i);if(a)return console.log("Skript oder Stylesheet bereits geladen:",i),void n();function r(e,t){let i;return window.location.href.toLowerCase().indexOf("frontend.aspx")>-1&&(t="../"+t),"js"===e?(i=document.createElement("script"),i.src=t,i.type="text/javascript"):"css"===e&&(i=document.createElement("link"),i.href=t,i.type="text/css",i.rel="stylesheet"),i}a=r(e,t),a.id=i,a.onload=()=>{console.log("Skript/Stylesheet erfolgreich geladen:",t),n()},a.onerror=()=>{console.log("Fehler beim Laden von:",t,"Versuche:","dist/"+t);var a=document.getElementById(i);document.head.removeChild(a);let o="dist/"+t,s=r(e,o);s.id=i,s.onload=()=>{console.log("Fallback Skript/Stylesheet erfolgreich geladen:",o),n()},s.onerror=()=>{console.log("Fehler beim Laden des Fallbacks:",o),l(new Error("Fehler beim Laden des Skripts/Stylesheets, auch beim Fallback: "+o))},document.head.appendChild(s)},document.head.appendChild(a)}))},loadAllScripts:async function(){try{if(0==this.scriptsLoaded){let e=this;await Promise.all([e.loadScript("js","dist/ConfigTools/Scripts/PicklistSuggestions.js","PicklistSug"),e.loadScript("js","ConfigTools/Flexi/FlexiDialog.js","FlexiScript"),e.loadScript("css","ConfigTools/Flexi/flexi-dialog.css","Flexicss")]),e.scriptsLoaded=!0,console.log("Alle Skripte wurden erfolgreich geladen.")}}catch(e){console.error("Ein Skript konnte nicht geladen werden:",e)}},toFields:function(e,t){const i=function(e,t){return e.picklist&&(window.location.href.toLowerCase().indexOf("frontend.aspx")>-1?t.picklist="../"+(e.picklist.startsWith("~/")?e.picklist.replace("~/","/"):e.picklist):t.picklist=e.picklist),e.select&&(t.select=e.select.split(",")),e.link&&(t.link=e.link),t};return t.map((t=>{switch(t.type){case"I":return i(t,{type:"input",name:t.tag,label:t.name,value:t.value,required:t.required});case"C":return{type:"checkbox",name:t.tag,label:t.name,value:(n=t.value,[!0,"true","True","TRUE","on","ON","1",1].includes(n)),required:t.required};case"T":case"R":return{type:"textarea",name:t.tag,label:t.name,value:t.value,required:t.required};case"S":return{type:"input",name:t.tag,label:t.name,value:t.value,required:t.required,select:t.select?t.select.split(","):[]};case"D":return{type:"input",name:t.tag,label:t.name,value:t.value,required:t.required,picklist:`FlowBoardTab.aspx?view=columns&_id=${e}`};case"H":return{type:"htmltextarea",name:t.tag,label:t.name,value:t.value,required:t.required};case"P":return i(t,{type:"input",name:t.tag,label:t.name,value:t.value});case"A":return{type:"date",name:t.tag,label:t.name,value:t.value,required:t.required}}var n}))},toJSON:function(e,t){const i=function(e){return e.replace(/\\/g,"\\\\").replace(/\\"/g,'\\\\"').replace(/"/g,'\\"').replace(/\\n/g,"\\\\n").replace(/\\r/g,"\\\\r").replace(/\\t/g,"\\\\t").replace(/\\b/g,"\\\\b").replace(/\\f/g,"\\\\f").replace(/[\r\n]+/g,"\\n").replace(/[\t]+/g,"\\t")};let n=e;return n.forEach(((e,l)=>{n[l].value=t[e.tag],n[l].parsedValue=function(e,t){let n;if("C"===e)n=t?"1":"0";else if("T"===e)n=t;else if("A"===e){n=i(t);try{n&&""!=n&&(n=app.data._handleDate(n,!1),n=app.date.Format_Date_XML(n))}catch(e){console.error(e)}}else n=i(t);return n}(e.type,t[e.tag])})),n},dlgInit:async function(e){var t=document.createElement("style");t.id="dialogStyle",t.type="text/css",t.innerHTML="asseco-applus-sandbox-anchor {display:inline!important}",window.parent.document.getElementsByTagName("head")[0].appendChild(t);var i=document.createElement("style");i.id="dialogStyle2",i.type="text/css",i.innerHTML="body > DIV.ui-dialog.ui-resizable:not(.ui-corner-all) {width: 1000px!important}",document.getElementsByTagName("head")[0].appendChild(i),this.escDisabled=!0,window.addEventListener("keydown",this.escKeyHandler,!0),await this.loadAllScripts();var n=window.parent.document.querySelector('iframe[data-test-id="sandbox-iframe"]');n&&""==n.id&&n.setAttribute("id","meineIframeID"),this.currentLocation=window.location.href},dlgEnd:async function(){var e=window.parent.document.getElementById("dialogStyle");e.parentNode.removeChild(e);var t=document.getElementById("dialogStyle2");t.parentNode.removeChild(t),this.escDisabled=!1,window.removeEventListener("keydown",this.escKeyHandler,!0),this.htmlEditorFields=[],this.currentLocation&&""!=this.currentLocation&&window.history.replaceState(null,null,this.currentLocation)},escKeyHandler:function(e){this.escDisabled&&"Escape"===e.key&&e.preventDefault()},open:async function(e,t){let i=this;await i.dlgInit();let n=e.fields,l=this.toFields(0,n);e.groups=[{name:"group",fields:l}],delete e.fields;let a=e.htmlEditorWidth||this.defaultEditorWidth,r=e.htmlEditorHeight||this.defaultEditorHeight,o=await new Flexi.Dialog(e);return await o.show((async e=>{await i.configureFields(o,n,a,r),"function"==typeof t&&await t(e)})).then((async e=>(await i.dlgEnd(),e?i.toJSON(n,e.values().next().value):null)))},configureFields:async function(e,t,i,n){let l=[],a=[],r=[],o=[],s=this;if(t.forEach((async e=>{e.numeric?l.push(e):"A"===e.type?a.push(e):e.picklist&&!fw.isEmpty(e.picklist)&&e.picklist.indexOf("${")>-1?r.push(e):e.readonly&&o.push(e)})),l.forEach((async t=>{let i=e.form.querySelector(`input[name='${t.tag}']`);i&&(i.addEventListener("input",(function(e){let t=this.value;/^[0-9.,\-]*$/.test(t)||(this.value=t.slice(0,-1))})),i.addEventListener("change",(function(e){this.value=app.data._handleNumber(e.target.value,[null,t.decimals])})))})),a.forEach((async t=>{let i=e.form.querySelector(`input[name='${t.tag}']`);i&&i.addEventListener("change",(function(e){try{this.value=app.data._handleDate(e.target.value,!1)}catch(e){this.value=""}}))})),r.forEach((async t=>{let i=t.tag,n=null,l=t.picklist;let a=/\$\{([A-Za-z_][A-Za-z0-9_]*)\}/g.exec(l);a&&a[1]&&(n=a[1]),await s.configureDependentPicklist(e.form,l,n,i)})),o.length>0){let t=document.createElement("style");t.id="readonlyFieldsStyle",t.type="text/css",t.innerHTML=".flexi-row input[disabled] { background-color: var(--grey-30-color); color: var(--light-font-color); }",document.getElementsByTagName("head")[0].appendChild(t),o.forEach((async t=>{let i=e.form.querySelector(`input[name='${t.tag}']`);if(!i)return;let n=i.parentElement.getElementsByTagName("*");for(let e of n)e.setAttribute("disabled","disabled")}))}await s.configureHtmlEditor(e,t,i,n)},configureDependentPicklist:async function(e,t,i,n){let l="${"+i+"}";const a=e.querySelector(`input[name='${n}']`),r=a.nextSibling,o=r.cloneNode(!0);r.parentNode.replaceChild(o,r),o.addEventListener("click",(async function(n){let r=e.querySelector(`input[name='${i}']`).value,o=t.replace(l,r);await async function(e,t){let i=t+"&pickSearch=true&pickID=0&pickCol=0";i=i.replace(/[&\?]/,"?");const n=await utils.openDialog({url:i,height:300,width:500,autoOpen:!0,iframeId:"openModalPicklistIframe"});n&&(e.value=n,e.dispatchEvent(new Event("input")))}(a,o)}))},configureHtmlEditor:async function(e,t,i,n){let l=this;this.htmlEditorFields=[];const a=t.filter((e=>"R"===e.type)).map((e=>e.tag));if(!a||0==a.length)return void console.log("FlexiDialog: No HTML Editor fields found, no need to configure the HTML Editor");await this.loadScript("js","WebObjects/fw/libs/ckeditor5-build-classic/ckeditor.js","ckeditor"),a.forEach((async t=>{await l.convertTextareaToHtmlEditor(e,t,i,n)}));let r=e.form.closest(".flexi-dialog");if(i>340){let e=i-340+500;e>window.innerWidth&&(e=window.innerWidth),r.parentElement.style.width=e+"px"}if(r.parentElement.offsetHeight>window.innerHeight){let e=window.innerHeight-100;r.style.height=e+"px"}$(r).dialog("option","position",{my:"center",at:"center",of:window});const o=e.form.closest(".ui-dialog").querySelector(".ui-dialog-buttonset");if(!o)return void console.error("Button container not found");const s=o.querySelectorAll("button"),c=s[0]||o.querySelector('button:contains("Ok")'),d=s[1]||o.querySelector('button:contains("Abbrechen")');if(!c||!d)return void console.error("Dialog buttons not found");const u=c.cloneNode(!0),p=d.cloneNode(!0);c.style.display="none",d.style.display="none",u.addEventListener("click",(t=>{l.htmlEditorFields.forEach((t=>{for(const[i,n]of e.groups.entries()){const e=n.find((e=>e.field.name===t.name));if(e){const i=t.element.getValue(),n=i&&i.length>0?utils.encodeXml(i):"";e.field.value=n,e.value=n;break}}})),c.click()})),p.addEventListener("click",(e=>{l.htmlEditorFields=[],d.click()})),o.appendChild(u),o.appendChild(p)},convertTextareaToHtmlEditor:async function(e,t,i,n){let l=this;try{let a=e.form.querySelector(`textarea[name='${t}']`);if(!a||null==a)return void console.error(`FlexiDialog: Textarea with name ${t} not found.`);const r=a.value,o=a.name,s=`<div id="${o}" class="P2DATAPART" name="${o}" data-behavior="htmledit" data-drop-allowed="browser" style="width:${i}px;height:${n}px;"><div class="P2HTMLTEXT"><div id="${o}_ck5"></div></div><span class="buttonplaceholder"></span></div>`;a.insertAdjacentHTML("afterend",s);const c=a.nextElementSibling;a.remove(),a=c,await fw.tsObjHelpers.attachHtmlEditInstance(a);const d=fw.tsObjHelpers.getHtmlEditObjFromElement(a);d&&(d.setValue(utils.decodeXml(r)),l.htmlEditorFields.push({name:o,element:d})),app.form={},app.form.hasChanged=!1}catch(e){console.error(`FlexiDialog: Error while configuring HtmlEditor: ${e}`)}}};

async function dropToMonteur(fromRessource, rezuIds, toRessource) {
  let xmlData, rezuTs;
  debugger;
  console.log("dropToMonteur");
  try {
    //4,18,21,23,24,68
    let rezuIdList = rezuIds.split(";");

    if (rezuIdList.length == 0) {
      return;
    }

    rezuIdList.forEach((rezuId) => {
      rezuTs = app.soap.call("webobjects/webparts").getDBValue("TIMESTAMP", "REZU", "ID = " + rezuId);
      xmlData = "<row>"
              + `<ID>${rezuId}</ID>`
              + `<TIMESTAMP>${rezuTs}</TIMESTAMP>`
              + `<RESSOURCE>${toRessource}</RESSOURCE>`
              + "</row>";
      app.soap.call("webobjects/navbar").dbUpdate("REZU", xmlData);
    });

    refreshBoard();
    return true;
  } catch (error) {
    console.error("Ein Fehler ist aufgetreten:", error);
    await utils.askException(error);
  }

  return;
}

async function menuItemTourenplanung(ressource, rezuIds) {

  await openDialogView("~/Resource/ReZuTab.aspx?view=anp_rezus&t1.id=IN[" + rezuIds + "]", "", false);

  return;
}

async function menuItemRessourcenwechsel(rezu, ressource) {

  let rezuId = app.soap.call("webobjects/webparts").getDBValue("ID", "REZU", "REZU = '" + rezu + "'");
  let result = await openRessourcenwechselFlexiDialog(rezuId, ressource);

  if (result) {
    refreshBoard();
    return true;
  }

  return;
}

async function menuItemNeuterminierung(rezu) {

  let result = await openNeuterminierungFlexiDialog(rezu);

  if (result) {
    refreshBoard();
    return true;
  }

  return;
}

async function menuItemFertigstellung(rezu, ressource) {

  let rezuId = app.soap.call("webobjects/webparts").getDBValue("ID", "REZU", "REZU = '" + rezu + "'");
  let result = await processFertigstellungData(rezuId);

  if (result) {
    refreshBoard();
    return true;
  }

  return;
}

async function menuItemWeitererEinsatz(rezu, ressource) {

  let rezuId = app.soap.call("webobjects/webparts").getDBValue("ID", "REZU", "REZU = '" + rezu + "'");
  let result = await processWeitererEinsatzData(rezuId);

  if (result) {
    refreshBoard();
    return true;
  }

  return;
}

async function menuItemGrobplanung(rezu, ressource) {

  let rezuId = app.soap.call("webobjects/webparts").getDBValue("ID", "REZU", "REZU = '" + rezu + "'");
  let result = await processGrobplanungData(rezuId);

  if (result) {
    refreshBoard();
    return true;
  }

  return;
}

async function openDialogView(url, dialogArgs, refresh) {
  let currentLocation = window.location.href; //to fix the bug when opening a Tab.aspx and editing positions, as the URL is modified.

  if (url.indexOf("_nonav") < 0) {
    url += "&_nonav=1";
  }

  await utils.openDialog({url: url, dialogArgs: dialogArgs});

  if (window.location.href != currentLocation) {
    window.history.replaceState(null, null, currentLocation); //to fix the bug when opening a Tab.aspx and editing positions, as the URL is modified.¿
  }

  if (refresh) {
    refreshBoard();
  }

  return;

}

function refreshBoard() {
  let doc;

  if (document.getElementById("flowframe") !== null) {
    doc = document.getElementById("flowframe").contentDocument || document.getElementById("flowframe").contentWindow.document;
  } else {
    doc = parent.document;
  }

  doc.querySelector('[data-test-id="refresh-button"]')?.click();
}

async function openNeuterminierungFlexiDialog(rezu) {
  let fields, config, data;
  debugger;
  try {

    let ressource = app.soap.call("webobjects/webparts").getDBValue("RESSOURCE", "REZU", "REZU = '" + rezu + "'");
    let startDate = app.soap.call("webobjects/webparts").getDBValue("POSPLANSTART", "REZU", "REZU = '" + rezu + "'");
    let endDate = app.soap.call("webobjects/webparts").getDBValue("POSPLANENDE", "REZU", "REZU = '" + rezu + "'");

    startDate = app.date.Format_Date_Short(startDate);
    endDate = app.date.Format_Date_Short(endDate);

    fields = [
      { tag: "POSPLANSTART", name: "Starttermin", type: "A", required: true, value: startDate || "" },
      { tag: "POSPLANENDE", name: "Endtermin", type: "A", required: true, value: endDate || "" },
      { tag: "RESSOURCE", name: "Ressource", type: "I", required: true, value: ressource || "", picklist: "~/Resource/RessourceTab.aspx?view=pickressgruppe&aktiv=1&ANP_POOL=1" }
    ];

    config = {
      title: "Neuterminierung",
      width: 400,
      okLabel: "Ok",
      cancelLabel: "Abbrechen",
      fields: fields
    };

    data = await FlexiDialog.open(config);

    if (!fw.isEmpty(data)) {
      return await processNeuterminierungData(rezu, data);
    }
  } catch (error) {
    console.error("Error in openNeuterminierungFlexiDialog:", error);
    await utils.askException(error);
  }

  return;
}

async function processNeuterminierungData(rezu, data) {
  try {
    let objData = {};
    let rezuId = app.soap.call("webobjects/webparts").getDBValue("ID", "REZU", "REZU = '" + rezu + "'");

    data.forEach((item) => {
      objData[item.tag] = item.parsedValue || item.value;
    });

    await dbUpdate("REZU", rezuId, objData, false, false);
    return true;
  } catch (error) {
    console.error("Error in processNeuterminierungData:", error);
    await utils.askException(error);
  }

  return false;
}

async function openRessourcenwechselFlexiDialog(rezuId, defaultRessource) {
  let fields, config, data;
  debugger;
  try {
    fields = [
      { tag: "RESSOURCE", name: "Ressource", type: "I", required: true, value: defaultRessource || "", picklist: "~/Resource/RessourceTab.aspx?view=pickressgruppe&aktiv=1&ANP_POOL=1" },
      { tag: "ZUSATZLICHE_RESSOURCE", name: "Zusätzliche Ressource", type: "I", required: false, value: "", picklist: "~/Resource/RessourceTab.aspx?view=pickressgruppe&aktiv=1&ANP_POOL=1" }
    ];

    config = {
      title: "Ressourcenwechsel",
      width: 400,
      okLabel: "Ok",
      cancelLabel: "Abbrechen",
      fields: fields
    };

    data = await FlexiDialog.open(config);

    if (!fw.isEmpty(data) && !fw.isEmpty(rezuId)) {
      return await processRessourcenwechselData(rezuId, data);
    }
  } catch (error) {
    console.error("Error in openRessourcenwechselFlexiDialog:", error);
    await utils.askException(error);
  }

  return false;
}

async function processRessourcenwechselData(rezuId, data) {
  let rezuChanged = false;

  try {
    // Update the main REZU record with the new resource
    let currentRessource = app.soap.call("webobjects/webparts").getDBValue("RESSOURCE", "REZU", `ID = ${rezuId}`);
    let objData = { RESSOURCE: data.filter((item) => item.tag === "RESSOURCE")[0].parsedValue };

    if (currentRessource != objData.RESSOURCE) {
      await dbUpdate("REZU", rezuId, objData, false, false);
      rezuChanged = true;
    }

    // If additional resource is provided, create a new REZU record
    let zusatzlicheRessource = data.filter((item) => item.tag === "ZUSATZLICHE_RESSOURCE")[0].parsedValue;
    if (!fw.isEmpty(zusatzlicheRessource)) {
      let copyProperties = [
        "SOLLSTART",
        "SOLLENDE",
        "SOLLSTARTZEIT",
        "SOLLENDEZEIT",
        "PLANARBEIT",
        "BEMERKUNG",
        "REFOBJEKT",
        "REFGUID",
        "NORECHNUNG"
      ];

      let newRezuValues = {
        RESSOURCE: zusatzlicheRessource,
        STATUS: "10"
      };
      copyProperties.forEach((property) => {
        newRezuValues[property] = app.soap.call("webobjects/webparts").getDBValue(property, "REZU", `ID = ${rezuId}`);
      });

      let newRezuId = await dbInsert("REZU", newRezuValues);

      return (newRezuId && newRezuId > 0);
    }

    if (rezuChanged) {
      return true;
    }
  } catch (error) {
    console.error("Error in processRessourcenwechselData:", error);
    await utils.askException(error);
  }

  return false;
}

async function processFertigstellungData(rezuId) {
  debugger;
  let newAuftragPosId, fertigstellungArtikel;

  try {
    let projekt = app.soap.call("webobjects/webparts").getDBValue("ANP_PROJEKT", "REZU", `ID = ${rezuId}`);
    let projektTyp = app.soap.call("webobjects/webparts").getDBValue("PROJEKTTYP", "PROJEKT", `PROJEKT = '${projekt}'`);

    let projektArt = app.soap.call("admin/sysconf/sysconf").getString("PROJEKT", "PROJEKTTYP"); //Aufzug,Homelift,Treppenlift,Entwicklung,Vertrieb
    let sysNachProjektArt = app.soap.call("admin/sysconf/sysconf").getString("CUSTOM", "ARTIKEL_NACH_PROJEKTART"); //Aufzug:SRV0003,Homelift:HL001,Treppenlift:TL001

    let projektArtList = projektArt.split(",");
    let projektArtName = (projektTyp - 1) < projektArtList.length ? projektArtList[projektTyp - 1] : "";
    let sysNachProjektArtList = sysNachProjektArt.split(",");
    let sysNachProjektItem = sysNachProjektArtList.find(item => item.startsWith(projektArtName + ":"));
    let sysNachProjektItemValues = sysNachProjektItem.split(":");
    fertigstellungArtikel = sysNachProjektItemValues.length > 1 ? sysNachProjektItemValues[1] : "";

    if (fw.isEmpty(fertigstellungArtikel)) {
      await utils.nlsInfo("Fertigstellung Artikel nicht gefunden.");
      return false;
    }

    // 1. copy serviceauftragposition
    let auftrag = app.soap.call("webobjects/webparts").getDBValue("rr.BELEG", "REZU r JOIN REZU_REF rr ON r.guid = rr.guid", `r.ID = ${rezuId} AND rr.refobjekt = 'auftragpos'`);
    let position = app.soap.call("webobjects/webparts").getDBValue("rr.BELEGPOSITION", "REZU r JOIN REZU_REF rr ON r.guid = rr.guid", `r.ID = ${rezuId} AND rr.refobjekt = 'auftragpos'`);

    if (fw.isEmpty(auftrag) || fw.isEmpty(position)) {
      await utils.nlsInfo("Auftrag oder Position nicht gefunden.");
      return false;
    }
    let menge = app.soap.call("webobjects/webparts").getDBValue("MENGE", "AUFTRAGPOS", `AUFTRAG = '${auftrag}' AND POSITION = '${position}'`);

    if (app.soap.call("sales/auftragpos").posCopyAllowed(auftrag, position)) {
      let xmlstring = "<Auswahl><pos nr='" + position + "' menge='" + menge + "' /></Auswahl>";

      await app.job.startJob("sales/auftrag", "Auftragposition kopieren", "convertReceipt", auftrag, xmlstring, "Auftrag", auftrag, "<xml><copyPos/></xml>", null);
      newAuftragPosId = app.soap.call("sales/auftrag").getLastPosID(auftrag);
    }

    if (fw.isEmpty(newAuftragPosId)) {
      await utils.nlsInfo("Auftragposition nicht erstellt.");
      return false;
    }

    // 2. Update artikel of the new auftragpos
    let apData = { ARTIKEL: fertigstellungArtikel };
    await dbUpdate("AUFTRAGPOS", newAuftragPosId, apData, false, false);

    // 3. Create new rezu for the data.
    let newRezuId = await neueReZuFromServicePos(newAuftragPosId);

    if (!fw.isEmpty(newRezuId)) {
      // 3.1 update the ANP_PROJEKT and ANP_PROJEKTPOS to the new rezu
      let projekt = app.soap.call("webobjects/webparts").getDBValue("ANP_PROJEKT", "REZU", `ID = ${rezuId}`);
      let projektPos = app.soap.call("webobjects/webparts").getDBValue("ANP_PROJEKTPOS", "REZU", `ID = ${rezuId}`);
      if (!fw.isEmpty(projekt) || !fw.isEmpty(projektPos)) {
        await dbUpdate("REZU", newRezuId, { ANP_PROJEKT: projekt, ANP_PROJEKTPOS: projektPos }, false, false);
      }

      // 4. Update serviceauftragpos status to 4 (disponiert)
      let currentStatus = app.soap.call("webobjects/webparts").getDBValue("STATUS", "AUFTRAGPOS", `ID = ${newAuftragPosId}`);
      if (currentStatus < 4) {
        if (currentStatus < 3) { // if status is < 3, set status to 3 (freigegeben)
          await dbUpdate("AUFTRAGPOS", newAuftragPosId, { STATUS: 3 }, false, false);
        }

        // then set status to 4 (disponiert)
        await dbUpdate("AUFTRAGPOS", newAuftragPosId, { STATUS: 4 }, false, false);
      }

      // close the original rezu
      await closeReZu(rezuId);

      return true;
    }

  } catch (error) {
    console.error("Error in processFertigstellungData:", error);
    await utils.askException(error);
    refreshBoard();
  }

  return false;
}

async function closeReZu(rezuId) {
  try {
    await dbUpdate("REZU", rezuId, { STATUS: statusConstants.ReZuObject.STATUS_ABGESCHLOSSEN }, false, false);
    return true;
  } catch (error) {
    console.error("Error in closeReZu:", error);
    await utils.askException(error);
  }

  return false;
}

async function processWeitererEinsatzData(rezuId) {
  debugger;
  let newAuftragPosId;

  try {
    // 1. copy serviceauftragposition
    let auftrag = app.soap.call("webobjects/webparts").getDBValue("rr.BELEG", "REZU r JOIN REZU_REF rr ON r.guid = rr.guid", `r.ID = ${rezuId} AND rr.refobjekt = 'auftragpos'`);
    let position = app.soap.call("webobjects/webparts").getDBValue("rr.BELEGPOSITION", "REZU r JOIN REZU_REF rr ON r.guid = rr.guid", `r.ID = ${rezuId} AND rr.refobjekt = 'auftragpos'`);

    if (fw.isEmpty(auftrag) || fw.isEmpty(position)) {
      await utils.nlsInfo("Auftrag oder Position nicht gefunden.");
      return false;
    }
    let menge = app.soap.call("webobjects/webparts").getDBValue("MENGE", "AUFTRAGPOS", `AUFTRAG = '${auftrag}' AND POSITION = '${position}'`);

    if (app.soap.call("sales/auftragpos").posCopyAllowed(auftrag, position)) {
      let xmlstring = "<Auswahl><pos nr='" + position + "' menge='" + menge + "' /></Auswahl>";

      await app.job.startJob("sales/auftrag", "Auftragposition kopieren", "convertReceipt", auftrag, xmlstring, "Auftrag", auftrag, "<xml><copyPos/></xml>", null);
      newAuftragPosId = app.soap.call("sales/auftrag").getLastPosID(auftrag);
    }

    if (fw.isEmpty(newAuftragPosId)) {
      await utils.nlsInfo("Auftragposition nicht erstellt.");
      return false;
    }

    // 2. Create new rezu for the data.
    let newRezuId = await neueReZuFromServicePos(newAuftragPosId);

    if (!fw.isEmpty(newRezuId)) {
      // 2.1 update the ANP_PROJEKT and ANP_PROJEKTPOS to the new rezu
      let projekt = app.soap.call("webobjects/webparts").getDBValue("ANP_PROJEKT", "REZU", `ID = ${rezuId}`);
      let projektPos = app.soap.call("webobjects/webparts").getDBValue("ANP_PROJEKTPOS", "REZU", `ID = ${rezuId}`);
      if (!fw.isEmpty(projekt) || !fw.isEmpty(projektPos)) {
        await dbUpdate("REZU", newRezuId, { ANP_PROJEKT: projekt, ANP_PROJEKTPOS: projektPos }, false, false);
      }

      // 3. Update serviceauftragpos status to 4 (disponiert)
      let currentStatus = app.soap.call("webobjects/webparts").getDBValue("STATUS", "AUFTRAGPOS", `ID = ${newAuftragPosId}`);
      if (currentStatus < 4) {
        if (currentStatus < 3) { // if status is < 3, set status to 3 (freigegeben)
          await dbUpdate("AUFTRAGPOS", newAuftragPosId, { STATUS: 3 }, false, false);
        }

        // then set status to 4 (disponiert)
        await dbUpdate("AUFTRAGPOS", newAuftragPosId, { STATUS: 4 }, false, false);
      }

      // close the original rezu
      await closeReZu(rezuId);

      return true;
    }

  } catch (error) {
    console.error("Error in processFertigstellungData:", error);
    await utils.askException(error);
    refreshBoard();
  }

  return false;
}

async function processGrobplanungData(rezuId, data) {
  debugger;
  let ressource;

  try {
    // 1. ask for ressource
    ressource = await askRessourcenauswahl();
    if (fw.isEmpty(ressource)) {
      return false;
    }

    // 2. Get projectpos guid
    let projekt = app.soap.call("webobjects/webparts").getDBValue("ANP_PROJEKT", "REZU", `ID = ${rezuId}`);
    let projektPos = app.soap.call("webobjects/webparts").getDBValue("ANP_PROJEKTPOS", "REZU", `ID = ${rezuId}`);

    if (fw.isEmpty(projekt) || fw.isEmpty(projektPos)) {
      await utils.nlsInfo("Projekt oder Projektpos nicht gefunden.");
      return false;
    }

    let projektPosGuid = app.soap.call("webobjects/webparts").getDBValue("GUID", "PROJEKTPOS", `PROJEKT = '${projekt}' AND POSITION = '${projektPos}'`);

    // 3. Update rezu with the new ressource and change the object reference to the projectpos
    let objData = {
      RESSOURCE: ressource,
      REFOBJEKT: "projektpos",
      REFGUID: projektPosGuid
    }

    await dbUpdate("REZU", rezuId, objData, false, false);
    return true;
  } catch (error) {
    console.error("Error in processGrobplanungData:", error);
    await utils.askException(error);
  }

  return false;
}

async function askRessourcenauswahl() {
  let title, fields, config, data;

  try {
    title = "Ressourcenauswahl für Grobplanung ";

    fields = [
      { tag: "Ressourcenpool", name: "Ressourcenpool", type: "I", required: true, picklist: "~/Resource/RessourceTab.aspx?view=pickressgruppe&aktiv=1&ressourcegruppe=Montage_TL" }
    ];

    config = {
      title: title,
      width: 400,
      okLabel: "Ok",
      cancelLabel: "Abbrechen",
      fields: fields
    };

    data = await FlexiDialog.open(config);

    if (!fw.isEmpty(data)) {
      let selectedValue = null;
      data.forEach((item) => {
        if (item.tag === "Ressourcenpool") {
          selectedValue = item.parsedValue || item.value;
        }
      });
      return selectedValue;
    }
  } catch (error) {
    console.error("Error in openRessourcenauswahlFlexiDialog:", error);
    await utils.askException(error);
  }

  return null;
}

async function neueReZuFromServicePos(auftragPosId) {
  try {
    app.soap.call("resource/ressourceplan").writeScsInfo();
  }
  catch (e) {
    await utils.askException(e);
    return;
  }
  let retValue = null;
  let dlgParam;

  try {
    let auftrag = app.soap.call("webobjects/webparts").getDBValue("AUFTRAG", "AUFTRAGPOS", `ID = ${auftragPosId}`);
    let position = app.soap.call("webobjects/webparts").getDBValue("POSITION", "AUFTRAGPOS", `ID = ${auftragPosId}`);
    let userPos = app.soap.call("webobjects/webparts").getDBValue("USERPOS", "AUFTRAGPOS", `ID = ${auftragPosId}`);
    let name = app.soap.call("webobjects/webparts").getDBValue("NAME", "AUFTRAGPOS", `ID = ${auftragPosId}`);
    let guid = app.soap.call("webobjects/webparts").getDBValue("GUID", "AUFTRAGPOS", `ID = ${auftragPosId}`);
    let liefertermin = app.soap.call("webobjects/webparts").getDBValue("LIEFERTERMIN", "AUFTRAGPOS", `ID = ${auftragPosId}`);
    let fez = app.soap.call("webobjects/webparts").getDBValue("FEZ", "AUFTRAGPOS", `ID = ${auftragPosId}`);
    let wunschtermin = app.soap.call("webobjects/webparts").getDBValue("WUNSCHTERMIN", "AUFTRAGPOS", `ID = ${auftragPosId}`);

    // Parameter zusammenstellen:
    dlgParam = new Array(7);
    dlgParam[0] = auftrag || "";
    dlgParam[1] = position || "";
    dlgParam[2] = userPos || "";
    dlgParam[3] = name || "";
    dlgParam[4] = "";
    dlgParam[5] = "";
    dlgParam[8] = guid || "";
    dlgParam[9] = "AUFTRAGPOS";
    dlgParam[10] = liefertermin || "";
    //Checking if FEZ has to be set as Start Date instead of LIEFERTERMIN
    if (!fw.isEmpty(fez) && !fw.isEmpty(wunschtermin)) {
      let FEZ_ = fez.split("-");
      let fezmonth = app.number.Parse(FEZ_[1], true) - 1;
      let FEZDATUM = new Date(parseInt(FEZ_[0], 10), fezmonth, parseInt(FEZ_[2].substring(0, 2), 10));

      let WUNSCHTERMIN_ = wunschtermin.split("-");
      let WMonth = app.number.Parse(WUNSCHTERMIN_[1], true) - 1;
      let WUNSCHTERMINDATUM = new Date(parseInt(WUNSCHTERMIN_[0], 10), WMonth, parseInt(WUNSCHTERMIN_[2].substring(0, 2), 10));

      if (WUNSCHTERMINDATUM < FEZDATUM) {
        dlgParam[10] = fez;
        dlgParam[11] = true;
      }
    }

    // Dialog öffnen, der die ReZu anlegt und evtl. eine URL zurückliefert:
    retValue = (await utils.openDialog({
      url: "~/Resource/newReZuDlg.aspx?refobj=serviceauftragpos",
      dialogArgs: dlgParam,
    }));

    if (!fw.isEmpty(retValue)) {
      let values = retValue.split(";");
      return values.length >= 1 ? values[0] : null;
    }
  } catch (e) {
    await utils.askException(e);
  }

  return null;
} // neueReZu


async function dbInsert(table, values) {
  let xmlData = "<row>";
  let resultId;

  try {
    //Check if the document number to be created has already been specified in the list of values. If not, try to create it with the APplus NextNumber function.
    if (!values.hasOwnProperty(table.toUpperCase()) && !values.hasOwnProperty(table.toLowerCase())) {
      let number = app.soap.call("webobjects/navbar").NextNumber(table);
      if (!fw.isEmpty(number)) {
        xmlData += `<${table}>${number}</${table}>`;
      }
    }

    Object.entries(values).forEach(([key, value]) => {
      xmlData += `<${key}>${value}</${key}>`;
    });

    xmlData += "</row>";
    //dbInsert function always should rece
    resultId = app.soap.call("webobjects/navbar").dbInsert(table, xmlData);

    if (!fw.isEmpty(resultId)) {
      return resultId;
    }
  } catch (e) {
    await utils.askException(e);
  }
  return 0;
}

async function dbUpdate(table, id, values, splitted = false, catchError = true) {
  let xmlData = "<row>";
  let timestamp, sqlColumn;

  const _dbUpdate = async () => {
    if (!values.hasOwnProperty("ID") && !values.hasOwnProperty("id")) {
      xmlData += `<ID>${id}</ID>`;
    }

    Object.entries(values).forEach(([key, value]) => {
      xmlData += `<${key}>${value}</${key}>`;
    });

    if (xmlData.toUpperCase().indexOf("<TIMESTAMP>") < 0) {
      if (splitted) {
        sqlColumn = "CONCAT(master.dbo.fn_varbintohexstr(TIMESTAMP), '|', ID_A, '|', master.dbo.fn_varbintohexstr(TIMESTAMP_A))";
        timestamp = app.soap.call("webobjects/webparts").getDBValue(sqlColumn, table, `ID=${id}`);

        if (!fw.isEmpty(timestamp)) {
          xmlData += `<TIMESTAMP>${timestamp.replaceAll("0x", "")}</TIMESTAMP>`;
        }
      } else {
        timestamp = app.soap.call("webobjects/webparts").getDBValue("TIMESTAMP", table, `ID=${id}`);
        xmlData += `<TIMESTAMP>${timestamp}</TIMESTAMP>`;
      }
    }

    xmlData += "</row>";
    app.soap.call("webobjects/navbar").dbUpdate(table, xmlData);
    return true;
  };

  if (catchError) {
    try {
      return await _dbUpdate();
    } catch (e) {
      await utils.askException(e);
    }
    return false;
  } else {
    return await _dbUpdate();
  }
}
