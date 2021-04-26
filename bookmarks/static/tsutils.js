var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
// ------------ Utitlity functions for DOM manipulation -----------------//
export var dom;
(function (dom) {
    // Select DOM element by CSS selector 
    function select(selector) {
        return document.querySelector(selector);
    }
    dom.select = select;
    function selectAll(selector) {
        return document.querySelectorAll(selector);
    }
    dom.selectAll = selectAll;
    // Toggle DOM element 
    function toggle(m) {
        if (m == null) {
            alert(" Error: element not found");
        }
        var d = m.style.display;
        var v = window.getComputedStyle(m);
        // if(m.style.visibility == "" || m.style.visibility == "visible")
        if (v.visibility == "visible") {
            console.log(" [TRACE] => Hide element");
            m.style.visibility = "hidden";
            m.style.display = "none";
        }
        else {
            console.log(" [TRACE] => Show element");
            m.style.visibility = "visible";
            m.style.display = "block";
        }
    } /* -- End of - DOM_toggle() --- */
    dom.toggle = toggle;
    function event_onClicked(selector, callback) {
        var elem = document.querySelector(selector);
        if (!elem) {
            console.warn(` dom_onClicked() => CSS selector ${selector} not found.`);
        }
        if (elem) {
            elem.addEventListener("click", callback);
        }
    }
    dom.event_onClicked = event_onClicked;
    /** Event fired after content is loaded. */
    function event_onContentLoaded(callback) {
        document.addEventListener("DOMContentLoaded", callback);
    }
    dom.event_onContentLoaded = event_onContentLoaded;
    /** Reload current page. (same as hit F5 in the web browser) */
    function page_refresh() {
        document.location.reload(true);
    }
    dom.page_refresh = page_refresh;
    /** Redirect URL */
    function url_redirect(url) {
        document.location.href = url;
    }
    dom.url_redirect = url_redirect;
    function url_newtab(url) {
        var win = window.open(url, '_blank');
        win.focus();
    }
    dom.url_newtab = url_newtab;
})(dom || (dom = {})); // End of namespace 
export class EventManager {
    constructor() {
        this.observers = [];
        document.addEventListener("DOMContentLoaded", () => {
            for (let func of this.observers) {
                func();
            }
        });
    }
    add_observer(obs) {
        this.observers.push(obs);
    }
    event_onClick(selector, callback) {
        let action = () => {
            let elem = document.querySelector(selector);
            if (!elem) {
                console.warn(` dom_onClicked() => CSS selector ${selector} not found.`);
            }
            if (elem) {
                elem.addEventListener("click", callback);
            }
        };
        this.observers.push(action);
    }
    // Event that is invoked when html DOM element has focus and user hits return.
    event_onHitReturn(selector, callback) {
        let action = () => {
            let elem = document.querySelector(selector);
            if (!elem) {
                console.warn(` dom_onClicked() => CSS selector ${selector} not found.`);
            }
            elem.addEventListener("keypress", (event) => {
                if (event.keyCode != 13) {
                    return;
                }
                callback();
            });
        };
        this.observers.push(action);
    }
    event_onClickMany(class_selector, callback) {
        let action = () => {
            document.querySelectorAll(class_selector).forEach(elem => {
                elem.addEventListener("click", callback);
            });
        };
        this.observers.push(action);
    }
}
;
export var HttpMethod;
(function (HttpMethod) {
    // Http method for creating new resource
    HttpMethod["HTTP_POST"] = "POST";
    HttpMethod["HTTP_PUT"] = "PUT";
    HttpMethod["HTTP_GET"] = "GET";
    HttpMethod["HTTP_DELETE"] = "DELETE";
    HttpMethod["HTTP_PATCH"] = "PATCH";
})(HttpMethod || (HttpMethod = {}));
;
// Const for custom http status code that represents domain error.   
const STATUS_DOMAIN_ERROR = 599;
export class HttpRestResult {
    constructor(resp) {
        this.resp = null;
        this.resp = resp;
    }
    /// Returns true is the status code is 2xxx (200, 201 and more) 
    is_status_success() {
        return Math.floor(this.resp.status / 100) == 2;
    }
    // Server internal error: 5xx status code.
    is_server_error() {
        return Math.floor(this.resp.status / 100) == 5;
    }
    // Rest API domain-specific error.
    is_domain_error() {
        return this.resp.status == STATUS_DOMAIN_ERROR;
    }
    status() {
        return this.resp.status;
    }
    json() {
        return __awaiter(this, void 0, void 0, function* () {
            let data = yield this.resp.json();
            return data;
        });
    }
}
;
export function ajax_request(method, url, crfs_token, data = null) {
    return __awaiter(this, void 0, void 0, function* () {
        let params = {
            method: method,
            headers: {
                'Content-Type': 'application/json',
                'X-Requested-With': 'XMLHttpRequest',
                'X-CSRFToken': crfs_token
            }
        };
        if (data != null) {
            params["body"] = JSON.stringify(data);
        }
        const resp = yield fetch(url, params);
        return new HttpRestResult(resp);
    });
}
/** @brief Performs Http POST request to some endpoint.
 *  @param {string} url         - Http request (REST API) endpoint
 *  @param {string} crfs_token  - Django CRFSS token from global variable (generated_token)
 *  @param {object} data        - HTTP request body, aka payload
 */
export function ajax_post(url, crfs_token, data) {
    return __awaiter(this, void 0, void 0, function* () {
        var payload = JSON.stringify(data);
        const resp = yield fetch(url, {
            method: 'POST',
            credentials: "same-origin",
            headers: {
                'Content-Type': 'application/json',
                'X-Requested-With': 'XMLHttpRequest',
                'X-CSRFToken': crfs_token,
                dataType: 'json'
            },
            body: payload
        });
        console.log(" [TRACE] ajax_post = ", resp);
        return new HttpRestResult(resp);
    });
}
export function ajax_get(url, crfs_token) {
    return __awaiter(this, void 0, void 0, function* () {
        const resp = yield fetch(url, {
            method: 'GET',
            credentials: "same-origin",
            headers: {
                'Content-Type': 'application/json',
                'X-Requested-With': 'XMLHttpRequest',
                'X-CSRFToken': crfs_token
            }
        });
        // return resp.json();
        return new HttpRestResult(resp);
    });
}
// } // ---- End of tsmain namespace -----// 
//# sourceMappingURL=tsutils.js.map