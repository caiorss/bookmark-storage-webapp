
/** @brief Performs Http POST request to some endpoint. 
 *  @param {string} url         - Http request (REST API) endpoint 
 *  @param {string} crfs_token  - Django CRFSS token from global variable (generated_token)
 *  @param {object} data        - HTTP request body, aka payload  
 */
async function ajax_post(url, crfs_token, data)
{

    var payload = JSON.stringify(data);

    const resp = await fetch(url, {
          method:  'POST'
        , headers: {    'Content-Type':     'application/json'
                      , 'X-Requested-With': 'XMLHttpRequest'
                      , 'X-CSRFToken':      crfs_token 
                   }
        , body: payload
    });
    return resp.json();
}

async function ajax_get(url, crfs_token, data)
{

    var payload = JSON.stringify(data);

    const resp = await fetch(url, {
          method:  'GET'
        , headers: {    'Content-Type':     'application/json'
                      , 'X-Requested-With': 'XMLHttpRequest'
                      , 'X-CSRFToken':      crfs_token 
                   }
        , body: payload
    });
    return resp.json();
}


/** Wrapper function to document.querySelectorAll, but returns array instead of NodeList. 
 * 
 */
function dom_querySelectorAll(css_selector)
{
    return Array.prototype.slice.call(document.querySelectorAll(css_selector));
}

function dom_onClicked(css_selector, callback)
{
    var elem = document.querySelector(css_selector);
    console.assert(elem, "dom_onClicked() => Element with css_selector not found in DOM");
    elem.addEventListener("click", callback);
}

function DOM_select(selector)
{
    return document.querySelector(selector);
}

// Toggle DOM element 
function DOM_toggle(m)
{
    if(m == null){ alert(" Error: element not found");  }
    var d = m.style.display;
    var v = window.getComputedStyle(m);

    // if(m.style.visibility == "" || m.style.visibility == "visible")
    if(v.visibility == "visible")
    {
        console.log(" [TRACE] => Hide element");
        m.style.visibility = "hidden";
        m.style.display = "none";
    } else {
        console.log(" [TRACE] => Show element");
        m.style.visibility = "visible";
        m.style.display = "block";
    }        
} /* -- End of - DOM_toggle() --- */


// Set visibility of DOM element 
function DOM_set_visibility(m, flag)
{
    if(m == null){ alert(" Error: element not found");  }
    var d = m.style.display;
    var v = window.getComputedStyle(m);
    // if(m.style.visibility == "" || m.style.visibility == "visible")
    if(flag == true)
    {
        console.log(" [TRACE] => Hide element");
        m.style.visibility = "hidden";
        m.style.display = "none";
    } else {
        console.log(" [TRACE] => Show element");
        m.style.visibility = "visible";
        m.style.display = "block";
    }        
} /* -- End of - DOM_toggle() --- */


// Boolean flag ('true' or 'false') stored in html5
// local storage API. It is useful for storing non critical 
// user preference data on client-side. 
function LocalStorageFlag(name, value)
{
    this.name = name;
    this._dummy = (function() {
        var q = localStorage.getItem(name);
        if(q == null || q == "undefined" ){
            localStorage.setItem(name, value);
        }
    }());

    this.get     = () => {
        var result = localStorage.getItem(this.name);
        if(result == "undefined") { 
            this.set(false);
            return false;            
        }
        return JSON.parse(result) || false;
    };
    this.set     = (value) => localStorage.setItem(this.name, value);
    this.toggle  = ()      => { this.set(!this.get()); return this.get(); }
};



function LocalStorageString(name, value)
{
    this.name = name;
    this._dummy = (function() {
        var q = localStorage.getItem(name);
        if(q == null || q == "undefined" ){
            localStorage.setItem(name, value);
        }
    }());

    this.get = ( default_value ) => {
        var result = localStorage.getItem(this.name);
        if(result == "undefined") { 
            this.set(default_value);
            return default_value;            
        }
        return result;
    };
    this.set = (value) => localStorage.setItem(this.name, value);    
};




// ----------- Keyboard Navigation ------------------ //

navigation_enabled_flag = "navigation_enabled";

flagKeyboardShortcut = new LocalStorageFlag("navigation_enabled", false);


function KeyDispatcher() {
    this._disp = {};
    this._toggle_key_code = 27; /* ESC */

    this.add_key = (keycode, callback) => {  this._disp[keycode] = callback; };

    this.process_key = (e) => {
	if(e.which == this._toggle_key_code)
	    enable_keyboard_shortcut(flagKeyboardShortcut.toggle());
	    
	console.log(" [TRACE] User typed key = " + e.which);
	var callback = this._disp[e.which];
	if(flagKeyboardShortcut.get() && callback != null){ callback(); }
    };
    
    this._ctor = (() => {
	                  document.onkeyup = this.process_key;
	                  console.log(" [TRACE] Constructed OK.");
			})();
}


function show_keybind_help()
{
    alert([  " Keyboard Navigation Enabled. Ok "
            ,"\n Keybindings: "
            ," === General ==========================="
            ,"  => (?) - Show this messagebox"
            ,"  => (t) - Toggle sidebar"
            ,"  => (y) - Toggle items information table."
            ," === Items ============================="
            ," => (j) - Focus on previous bookmark"
            ," => (k) - Focus on next bookmark"            
            ," => (o) - Open Selected bookmark in a new tab and switch to it."
            ," => (i) - Open Selected bookmark in a new tab. (DON'T switch to it)"
            ," === Results Paging ====================="
            ,"  => (b) - Show previous 15 results (paging)."
            ,"  => (n) - Show next 15 results (paging)."            
            ," === Pages =============================="
            ,"  => (1) - Show all items ordered by newest."
            ,"  => (2) - Show all items ordered by oldest."
            ,"  => (3) - List only starred items."
            ,"  => (4) - List saved searches"
            ,"  => (5) - List music bookmarks."
          ].join("\n"));
}

function Counter(value, max){
    this.value = value;
    this.max   = max;
    this.get = () => this.value;
    this.increment = () => { if(this.value < max) this.value++; return this.value; }
    this.decrement = () => { if(this.value > 0  ) this.value--; return this.value; }
}

counter = new Counter(-1, 14);

// Shows whether keyboard shortcuts are enabled or disabled.
function set_keyboard_indicator(flag)
{
    var q = document.querySelector("#keyboard-status");
    q.textContent = flag ? "Keyboard shortcuts enabled" : "Keyboard shortcuts disabled ";
    q.style.background = flag ? "green" : "blue";
};

function enable_keyboard_shortcut(navigation_enabled)
{
    // navigation_enabled = !navigation_enabled;      
    flagKeyboardShortcut.set(navigation_enabled);
    set_keyboard_indicator(navigation_enabled);
};


function isMobileDevice() {
    try{ 
         document.createEvent("TouchEvent");
         //alert('Is mobile device OK');
         return true; 
        }
    catch(e){ 
        //alert('NOT MOBILE Device');
        return false;        
    }
};

kdb = new KeyDispatcher();
kdb.add_key(84 /* t */,() => {
    // console.log(" [TRACE] Toggle menu bar.");
     toggle_sidebar();
     var q = document.querySelector(".sidebar-nav a")
     q.focus();    
});

kdb.add_key(89 /* y */, toggle_items_table_info);
kdb.add_key(191 /* '/' forward slash */, show_keybind_help);

kdb.add_key(78 /* n */, () => {
    var q = document.querySelector("#page-next-button");
    if(q != null) window.location.href = q.href;
});

kdb.add_key(66 /* b */, () => {
    var q = document.querySelector("#page-prev-button");
    if(q != null) window.location.href = q.href;

});

// Show latest or newest added bookmarks
kdb.add_key(49 /* 1 */, () => {
    window.location.href = "/items?filter=latest";
});

kdb.add_key(50 /* 2 */, () => {
    window.location.href = "/items?filter=oldest";
});

kdb.add_key(50 /* 3 */, () => {
    window.location.href = "/items?filter=starred";;
});

kdb.add_key(51 /* 4 */, () => {
    window.location.href = "/search/list";
});

// Select previous link 
kdb.add_key(74 /* j */, () => {
    var links = document.querySelectorAll(".item-bookmark-link");
    var e = links[counter.decrement()];
    e.focus();
    //counter.decrement();        
    //console.log(" [TRACE] current item = " + counter.get());
    //if(current_item < links.length){ current_item = current_item + 1; }   
});

kdb.add_key(75 /* k */, () => {
    var links = document.querySelectorAll(".item-bookmark-link");      
    var e = links[counter.increment()];
    e.focus();
    //counter.increment();
    //console.log(" [TRACE] current item = " + counter.get());
});

// Open current bookmark when user types 'O'
kdb.add_key(79 /* o */, () => {
    var elem = document.activeElement;
    if(elem.className == "item-bookmark-link")
    {
        var win = window.open(elem.href, '_blank');
        win.focus();
    }        
});

// Open current bookmark when user types 'O'
kdb.add_key(83 /* s */, () => {
    var elem = document.querySelector("#search-entry-box");
    elem.focus();
    enable_keyboard_shortcut(false);    
});

// Shortcut for adding new item.
kdb.add_key(187 /* + */, () => {
    enable_keyboard_shortcut(false);
    window.location.href = "/items/new";
    
});



// ---- Executed after document (DOM objects) is loaded ---------- //

flagItemDetailsVisible = new LocalStorageFlag("itemsTableVisible", true);


function set_theme(mode)
{
    var root = document.documentElement;

    if(mode == "dark_mode")
    {           
        root.style.setProperty("--main-background-color", "#3c3c3c");
        root.style.setProperty("--foreground-color",      "white");
        root.style.setProperty("--item-background-color", "#2f2f2f");
        root.style.setProperty("--hyperlink-color",       "lightskyblue");
        
        root.style.setProperty("--right-row-label-color", "black");
        root.style.setProperty("--left-row-label-color", "#1b1b1b");

        root.style.setProperty("--btn-primary-bgcolor", "#007bff");
    }

    if(mode == "light_mode")
    {
        root.style.setProperty("--main-background-color", "lightgray");
        root.style.setProperty("--foreground-color",      "black");
        root.style.setProperty("--item-background-color", "ligthblue");
        root.style.setProperty("--hyperlink-color",       "darkblue");
        
        root.style.setProperty("--right-row-label-color", "#bdb3b3");
        root.style.setProperty("--left-row-label-color", "#82c5bc");

        root.style.setProperty("--btn-primary-bgcolor", "black");
    }
}


site_theme = new LocalStorageString("site_theme");

function selection_changed(mode)
{
    var mode = this.value;
    set_theme(mode);
    site_theme.set(mode);
}

/*  Usage example: 
 * 
 *     var anchor = document.querySelector("#element-dom-id");
 *     var div = insert_html_template(anchor, `<div> <h1>Title</h1> <button>My button</button></div>`);
 *    
 ******************************************************************/
function insert_html_template(anchor_element, html)
{
    var el = document.createElement("template");
    el.innerHTML = html;
    var elem = el.content.firstChild;
    anchor_element.appendChild(elem);
    return elem;
}

const ACTION_RESTORE = "RESTORE";
const ACTION_DELETE  = "DELETE";
const ACTION_STARRED = "STARRED";


async function ajax_perform_bulk_operation(action)
{
    var crfs_token = window["generated_token"];
    console.log(" [TRACE] Current token = ", crfs_token);

    // Get ID of selected bookmarks 
    var selected_items = dom_querySelectorAll(".bulk-checkbox")
                            .filter(x => x.checked)
                            .map(x => parseInt(x.id));
    
    console.log(" selected items = ", selected_items);

    var payload = {                  
        action:   action 
      , items:    selected_items
    };

    var resp = await ajax_post("/api/bulk", crfs_token, payload);
    console.log("Response = ",  resp);

    //return resp;
    // Reload current page 
    location.reload();
}


// Callback executed after DOM is fully loaded
document.addEventListener("DOMContentLoaded", () => {
    var flag = flagItemDetailsVisible.get();
    var obs = document.querySelectorAll(".item-details");
    obs.forEach(x => DOM_set_visibility(x, flag));    
    set_keyboard_indicator(flagKeyboardShortcut.get());

    var q = document.querySelector("#div-keyboard-status");
    if(isMobileDevice()){ DOM_toggle(q); }

    var elem_item_detail = document.querySelector("#item-details");
     

    var theme_selection_box = document.querySelector("#theme-selector-box");
    theme_selection_box.onchange = selection_changed;

    var theme = site_theme.get("dark_mode");
    set_theme(theme);

    if(theme == "dark_mode") theme_selection_box.selectedIndex = 0;
    if(theme == "light_mode") theme_selection_box.selectedIndex = 1;

    var body = document.body;

    var dialog = insert_html_template(body, `
        <dialog class="dialog-bulk-action"> 
            <div>
                <button id="btn-bulk-starred"> Mark items as starred</button> </br> 
                <button id="btn-bulk-delete">  Delete items</button>          </br> 
                <button id="btn-bulk-restore"> Restore items</button>         </br>             
            </div>
            <button id="btn-dialog-close">Close</button>
        </dialog>
    `.trim());

    var btn = dialog.querySelector("#btn-dialog-close");
    btn.addEventListener("click", () => dialog.close() );

    dom_onClicked("#btn-bulk-actions", () => dialog.showModal() );
    dom_onClicked("#btn-bulk-starred", () => ajax_perform_bulk_operation(ACTION_STARRED) );
    dom_onClicked("#btn-bulk-delete",  () => ajax_perform_bulk_operation(ACTION_DELETE) );
    dom_onClicked("#btn-bulk-restore", () => ajax_perform_bulk_operation(ACTION_RESTORE) );

    
});


function toggle_sidebar()
{
    var s = DOM_select(".sidebar");
    DOM_toggle(s);
}

function toggle_items_table_info()
{
    flagItemDetailsVisible.toggle();
    var flag = flagItemDetailsVisible.get();
    var obs = document.querySelectorAll(".item-details");
    obs.forEach(x => DOM_set_visibility(x, flag));    
}

function toggle_action_menu(actionID)
{
    var elem = document.querySelector(actionID);
    DOM_toggle(elem);
}

function open_url_newtab(url)
{
    var win = window.open(url, '_blank');
    win.focus();
}

function api_item_add(csrf_token)
{
    var guess = "";

    var send_url = (url) => {       
        var xhr = new XMLHttpRequest();
        xhr.open("POST", "/api/item", true);
        
        // Called when request is completed 
        xhr.onload = () => {
            // print JSON response
            if (xhr.status >= 200 && xhr.status < 300) {
                // parse JSON
                var resp = JSON.parse(xhr.responseText);
                console.log(resp);
                
                if(resp["result"] == "OK")
                    location.reload();
                else 
                    alert(" Error: " + resp["reason"]);
            }        
        };
    
        xhr.onerror = () => {
            alert(" [ERROR] Network error.")
        };
    
        // 
    
        xhr.setRequestHeader('Content-Type', 'application/json');
        xhr.setRequestHeader('X-CSRFToken', generated_token);
        var body = { "url": url};
        xhr.send(JSON.stringify(body));
    
    }; // end of send_url()

    var query_url = (guess) => {
        var url = prompt("Enter the URL to add:", guess);
        if(url == null) return;
        send_url(url);
    }

    if( navigator.clipboard == null 
        || navigator.clipboard.readText == null ){
        query_url("");
        return;
    }

    navigator.clipboard.readText()
        .then(text => { guess = text; 
                        console.log("Text =  " + text);
                        query_url(guess);
        
             })
        .catch(err => { console.error(" Error: = " + err);
             query_url("");
            });

    
}


class YoutubeThumb extends HTMLElement {
    constructor() {
        super()
        this.attachShadow( { mode: 'open' } )            
    }

    connectedCallback() {
        var video = this.getAttribute("video");
        console.log("VIDEO = ", video);
        this.shadowRoot.innerHTML = `
            <style>
                .youtube-embed {
                    visibiity: visible;
                    /* background-color: gray; */
                    width:  500px;
                    height: auto;
                    display: block;
                }

                span {
                    color: black;
                    font-size: 14pt;
                    font-weight: 500%;
                }

                img {
                    width:  60%;
                    height: auto;
                }

            </style>

            <div class="youtube-embed">                 
                 <a href="https://www.youtube.com/watch?v=${video}" target="_blank"> 
                   <img src="https://img.youtube.com/vi/${video}/sddefault.jpg" />                             
                 </a>
            </div>
            `;
                                    
            
    }
}
customElements.define('youtube-thumb', YoutubeThumb);