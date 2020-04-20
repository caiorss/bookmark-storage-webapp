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

function toggle_sidebar()
{
    var s = DOM_select(".sidebar");
    DOM_toggle(s);
}

function toggle_items_table_info()
{
    var obs = document.querySelectorAll(".item-table-info");
    obs.forEach(DOM_toggle);
}