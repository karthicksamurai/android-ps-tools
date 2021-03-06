// Android Elements
// Author: Tim Roes <mail@timroes.de>

/*
<javascriptresource>
<name>Android Elements</name>
<category>Android_PS_Tools</category>
<about>Insert Android elements into your document.</about>
<enableinfo>true</enableinfo>
</javascriptresource>
*/

#target photoshop
#include "./~android-funcs.js"

app.bringToFront();

var search;

var win;
var elList, preview, preview_txt;
var holoDark, holoLight;
var backbutton;
var donotclose;

var currentFolder;

Image.prototype.onDraw = function() {
	// written by Marc Autret
	// "this" is the container; "this.image" is the graphic
	if( !this.image ) return;
	var WH = this.size
	var wh = this.image.size;
	var k;
	if( wh[0] <= WH[0] && wh[1] <= WH[1]) 
	k = 1;
	else 
	k = Math.min(WH[0]/wh[0], WH[1]/wh[1]);
	var xy;
	// Resize proportionally:
	wh = [k*wh[0],k*wh[1]];
	// Center:
	xy = [ (WH[0]-wh[0])/2, (WH[1]-wh[1])/2 ];
	this.graphics.drawImage(this.image,xy[0],xy[1],wh[0],wh[1]);
	WH = wh = xy = null;
}

function thumbPath(file) {
	var thumbPath = file.fullName.replace(EL_DIR, EL_THUMB_DIR);
	thumbPath = thumbPath.substr(0, thumbPath.lastIndexOf('.')) + '.png';
	return thumbPath;
}

/**
 * Click in list (or Enter) will either show subelements,
 * or include the element in the current document.
 */
function clickList(ev) {
	
	var sel = elList.selection.file_object;
	if(sel instanceof File) {
		preview.image = thumbPath(sel);
	} else if(sel instanceof Folder) {
		search.text = "";
		currentFolder = sel;
		loadSubElements(sel);
	}

}

function dblClickList(ev) {

	var sel = elList.selection.file_object;
	search.text = "";
	if(sel instanceof File) {
		importFile(sel);
		if(!donotclose.value)
			win.close();
		preview.image = thumbPath(sel);
	} else if(sel instanceof Folder) {
		// We selected a folder, so go deeper
		search.text = "";
		currentFolder = sel;
		loadSubElements(sel);
	} 

}

/**
 * Go Back to element selection.
 */
function goBack() {
	loadElements();
}

/**
 * When holo theme changed, try to find the current resource in 
 * new holo theme, otherwise go back to selection.
 */
function holoChanged(ev) {
	saveHoloPref(getHolo());
	if(currentFolder) {
		var notHolo = (getHolo() == HOLO_DARK) ? HOLO_LIGHT : HOLO_DARK;
		var newPath = currentFolder.fullName.replace(notHolo, getHolo());
		currentFolder = new Folder(newPath);
		if(!currentFolder) {
			loadElements();
		} else {
			loadSubElements(currentFolder);
		}
	} else {
		loadElements();
	}
}

function buildElementUI() {

	win = new Window('dialog', 'Android Elements');
	win.alignChildren = "fill";
	win.addEventListener("keydown", function(ev) {
		// If user hit Enter, select first item in list.
		if(ev.keyName == "Enter" && elList.items.length > 0) {
			elList.selection = 0;
			clickList(null);
		}
		if(ev.keyName == "Escape" && ev.shiftKey) {
			goBack();
		}
		search.active = true;
	});

	var searchGroup = win.add("group");
	var searchLabel = searchGroup.add("statictext");
	searchLabel.text = "Search:";
	search = searchGroup.add("edittext");
	search.characters = 30;
	search.active = true;
	search.onChanging = function(ev) {
		updateList();
	};

	var holoGroup = win.add("group");
	holoGroup.orientation = "row";
	holoLight = holoGroup.add("radiobutton", undefined, "Holo &Light");
	holoDark = holoGroup.add("radiobutton", undefined, "Holo &Dark");
	if(getHoloPref() == HOLO_DARK)
		holoDark.value = true;
	else
		holoLight.value = true;
	holoLight.onClick = holoChanged;
	holoDark.onClick = holoChanged;

	backbutton = holoGroup.add("button", undefined, "&Select other");
	backbutton.alignment = "right";
	backbutton.hide();
	backbutton.onClick = goBack;

	elList = win.add("listbox", [0, 0, 350, 300]);
	elList.onDoubleClick = dblClickList;
	elList.onClick = clickList;

	var font = elList.graphics.font;
	elList.graphics.font = ScriptUI.newFont(font.name, font.style, 16);

	preview_txt = win.add("statictext", undefined, "Click to preview, Double click to insert");
	preview_txt.graphics.font = ScriptUI.newFont(font.name, font.style, 16);
	
	preview = win.add("image", [0, 0, 200, 200], undefined);
	preview.onClick = function() {
		dblClickList();
	}

	donotclose = win.add("checkbox", undefined, "&Don't close window after insert");
	donotclose.value = getClosePref();
	donotclose.onClick = function() {
		saveClosePref(donotclose.value);
	}

	holoChanged();
	win.show();
	
}

/**
 * Sort all elements, that are loaded alphabeticaly by their
 * display name.
 */
function sortElements() {
	allElements.sort(function(a, b) {
		return a.displayName > b.displayName;
	});
}

/**
 * Load subelements inside a specific folder.
 */
function loadSubElements(folder) {
	
	allElements = new Array();
	loadDir(folder);
	sortElements();
	updateList();

	// We are no in the deeper level, so show back button
	backbutton.show();

}

/**
 * Load all elements.
 */
function loadElements() {

	// Load holo dark or light elements
	var dir = Folder.commonFiles;
	dir.changePath(DIR);
	dir.changePath(EL_DIR);
	dir.changePath(getHolo());
	
	allElements = new Array();

	loadDir(dir);

	// Load general holo elements
	dir = Folder.commonFiles;
	dir.changePath(DIR);
	dir.changePath(EL_DIR);
	dir.changePath(HOLO);

	loadDir(dir);

	sortElements();
	updateList();

	// Hide back button, we are on highest level
	backbutton.hide();
	currentFolder = null;

}

/**
 * Load all files inside a given directory and add them to the list.
 */
function loadDir(dir) {
	var elements = dir.getFiles();

	for(var i in elements) {
		allElements.push(elements[i]);
	}
}

function getHolo() {
	return (holoDark.value == true) ? HOLO_DARK : HOLO_LIGHT;
}

/**
 * Update the list of elements, taking the current search filter into respect.
 */
function updateList() {

	var filter = search.text.toLowerCase();

	elList.removeAll();

	for(var i in allElements) {

		var e = allElements[i];
		if(!filter || e.displayName.toLowerCase().indexOf(filter) !== -1) {
			var item = elList.add("item", stripExt(e.displayName));
			if(e instanceof Folder) {
				item.text += " \u00BB";
			}
			item.file_object = e;
		}

	}

}

if(!documents.length) {
	alert('There are no documents open.', 'No Documents Open', true);
} else if(parseInt(version, 10) < 10) {
	alert('This script requires at least Photoshop CS3.', 'Wrong Photoshop Version', true);
} else {
	var defaultRulerUnits = app.preferences.rulerUnits;
	app.preferences.rulerUnits = Units.PIXELS;
	try {
		app.activeDocument.suspendHistory('Insert Android element', 'buildElementUI();');
	} catch(e) {
		alert(e, 'Android Elements Error', true);
	}
	app.preferences.rulerUnits = defaultRulerUnits;
}
