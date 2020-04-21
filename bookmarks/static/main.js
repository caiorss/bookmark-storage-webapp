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

function localstorage_flag_set(name, value)
{
    localStorage.setItem(name, value);
}

function localstorage_flag_get(name)
{
    return JSON.parse(localStorage.getItem(name)) || false;
}

// Set local storage flag only once, if it is not initialized yet.
function localstorage_flag_init(name, value)
{
    var q = localStorage.getItem(name);
    if(q == null){
        localstorage_flag_set(name, value);
    }
}

function localstorage_flag_toggle(name)
{
    var f = localstorage_flag_get(name);
    localstorage_flag_set(name, !f);
}

// ----------- Keyboard Navigation ------------------ //

navigation_enabled_flag = "navigation_enabled";

function show_keybind_help()
{
    alert([  " Keyboard Navigation Enabled. Ok "
            ,"\n Keybindings: "
            ,"  => (?) - Show this messagebox"
            ,"  => (t) - Toggle sidebar"
            ,"  => (y) - Toggle items information table."
            ,"  => (b) - Show previous 15 results (paging)."
            ,"  => (n) - Show next 15 results (paging)."            
            ,"  => (1) - Show all items ordered by newest."
            ,"  => (2) - Show all items ordered by oldest."
            ,"  => (3) - List only starred items."
            ,"  => (4) - List saved searches"
            ,"  => (5) - List music bookmarks."
          ].join("\n"));
}

document.onkeyup = (e) => {
    // for IE to cover IEs window event-object
    var e = e || window.event; 
    var key = String.fromCharCode(e.which);
    console.log(" Pressed keybindind => key = " + key + " ; code = " + e.which);

    var navigation_enabled = localstorage_flag_get(navigation_enabled_flag);

    // Alt + P for enabling shortcut navigation 
    if(e.altKey && key == 'P') 
    {
        if(navigation_enabled == false){
            show_keybind_help();
        } else {
            alert(" Keyboard navigation disabled. Ok.")
        }
    
        // navigation_enabled = !navigation_enabled;      
        localstorage_flag_set(navigation_enabled_flag, !navigation_enabled);
    }    
    if(navigation_enabled && key == "T") 
    {
        toggle_sidebar();
    }
    if(navigation_enabled && key == "Y") 
    {
        toggle_items_table_info();
    }

    // User types: (?) question mark key.
    if(navigation_enabled && e.which == 191) 
    {
        show_keybind_help();
    }

    // Show next page 
    if(navigation_enabled && key == "N") 
    {
        var q = document.querySelector("#page-next-button");
        if(q != null) window.location.href = q.href;
    }

    // Show previous page 
    if(navigation_enabled && key == "B") 
    {
        var q = document.querySelector("#page-prev-button");
        if(q != null) window.location.href = q.href;
    }
    
    if(navigation_enabled && key == "1") 
    {
        window.location.href = "/items?filter=latest";
    }
    if(navigation_enabled && key == "2") 
    {
        window.location.href = "/items?filter=oldest";
    }
    if(navigation_enabled && key == "3") 
    {
        window.location.href = "/items?filter=starred";
    }
    if(navigation_enabled && key == "4") 
    {
        window.location.href = "/search/list";
    }
    
};

// ---- Executed after document (DOM objects) is loaded ---------- //

flag_items_table_visible = "items_table_visible";

document.addEventListener("DOMContentLoaded", () => {
    localstorage_flag_init(flag_items_table_visible, true);

    var flag = localstorage_flag_get(flag_items_table_visible);
    var obs = document.querySelectorAll(".item-details");
    obs.forEach(x => DOM_set_visibility(x, flag));    
});

function toggle_sidebar()
{
    var s = DOM_select(".sidebar");
    DOM_toggle(s);
}

function toggle_items_table_info()
{
    localstorage_flag_toggle(flag_items_table_visible);
    var flag = localstorage_flag_get(flag_items_table_visible);
    var obs = document.querySelectorAll(".item-details");
    obs.forEach(x => DOM_set_visibility(x, flag));    
}


