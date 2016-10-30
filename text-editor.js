/*!
 * ==========================================================
 *  TEXT EDITOR PLUGIN 2.5.3
 * ==========================================================
 * Author: Taufik Nurrohman <https://github.com/tovic>
 * License: MIT
 * ----------------------------------------------------------
 */

(function($) {

    // plugin version
    $.version = '2.5.3';

    // collect all instance(s)
    $.__instance__ = {};

    // plug to all instance(s)
    $.each = function(fn, t) {
        return setTimeout(function() {
            var ins = $.__instance__, i;
            for (i in ins) {
                fn(ins[i], i, ins);
            }
        }, t === 0 ? 0 : (t || 1)), $;
    };

    // key maps for the deprecated `KeyboardEvent.keyCode`
    $.keys = {
        // control
        3: 'cancel',
        6: 'help',
        8: 'backspace',
        9: 'tab',
        12: 'clear',
        13: 'enter',
        16: 'shift',
        17: 'control',
        18: 'alt',
        19: 'pause',
        20: 'capslock', // not working on `keypress`
        27: 'escape',
        28: 'convert',
        29: 'nonconvert',
        30: 'accept',
        31: 'modechange',
        33: 'pageup',
        34: 'pagedown',
        35: 'end',
        36: 'home',
        37: 'arrowleft',
        38: 'arrowup',
        39: 'arrowright',
        40: 'arrowdown',
        41: 'select',
        42: 'print',
        43: 'execute',
        44: 'printscreen', // works only on `keyup` :(
        45: 'insert',
        46: 'delete',
        91: 'meta', // <https://bugzilla.mozilla.org/show_bug.cgi?id=1232918>
        93: 'contextmenu',
        144: 'numlock',
        145: 'scrolllock',
        181: 'volumemute',
        182: 'volumedown',
        183: 'volumeup',
        224: 'meta',
        225: 'altgraph',
        246: 'attn',
        247: 'crsel',
        248: 'exsel',
        249: 'eraseeof',
        250: 'play',
        251: 'zoomout',
        // num
        48: ['0', ')'],
        49: ['1', '!'],
        50: ['2', '@'],
        51: ['3', '#'],
        52: ['4', '$'],
        53: ['5', '%'],
        54: ['6', '^'],
        55: ['7', '&'],
        56: ['8', '*'],
        57: ['9', '('],
        // symbol
        32: ' ',
        59: [';', ':'],
        61: ['=', '+'],
        173: ['-', '_'],
        188: [',', '<'],
        190: ['.', '>'],
        191: ['/', '?'],
        192: ['`', '~'],
        219: ['[', '{'],
        220: ['\\', '|'],
        221: [']', '}'],
        222: ['\'', '"']
    };

    // key alias(es)
    $.keys_alias = {
        'alternate': 'alt',
        'option': 'alt',
        'ctrl': 'control',
        'cmd': 'meta',
        'command': 'meta',
        'os': 'meta', // <https://bugzilla.mozilla.org/show_bug.cgi?id=1232918>
        'context': 'contextmenu',
        'return': 'enter',
        'ins': 'insert',
        'del': 'delete',
        'esc': 'escape',
        'left': 'arrowleft',
        'right': 'arrowright',
        'up': 'arrowup',
        'down': 'arrowdown',
        'space': ' ',
        'plus': '+'
    };

    // small caps
    function scap(x) {
        return x.toLowerCase();
    }

    // function
    for (var i = 1; i < 25; ++i) {
        $.keys[111 + i] = 'f' + i;
    }

    // alphabet
    for (var s = "", i = 65; i < 91; ++i) {
        $.keys[i] = scap(String.fromCharCode(i));
    }

    // add `KeyboardEvent.TE` property
    Object.defineProperty(KeyboardEvent.prototype, 'TE', {
        configurable: true,
        get: function() {
            var keys = $.keys,
                keys_alias = $.keys_alias;
            // custom `KeyboardEvent.key` for internal use
            var t = this,
                k = t.key ? scap(t.key) : keys[t.which || t.keyCode];
            if (typeof k === "object") {
                k = t.shiftKey ? (k[1] || k[0]) : k[0];
            }
            k = scap(k);
            function ret(x, y) {
                if (!x || x === true) return y;
                if (x instanceof RegExp) return y && x.test(k);
                return x = scap(x), y && (keys_alias[x] || x) === k;
            }
            return {
                key: function(x) {
                    if (!x || x === true) return k;
                    if (x instanceof RegExp) return x.test(k);
                    return x = scap(x), (keys_alias[x] || x) === k;
                },
                control: function(x) {
                    return ret(x, t.ctrlKey);
                },
                shift: function(x) {
                    return ret(x, t.shiftKey);
                },
                option: function(x) {
                    return ret(x, t.altKey);
                },
                meta: function(x) {
                    return ret(x, t.metaKey);
                }
            };
        }
    });

})(window.TE = function(target) {

    var w = window,
        d = document,
        $ = this,
        _ = 1, // cache of history length
        F = 0, // history feature is active
        H = [[val(), 0, 0, 0]], // load the first history data
        I = 0, // current state of history
        S = {}, // storage
        div = d.createElement('div'),
        span = d.createElement('span'),
        tab = '\t',
        scroll_width = (function() {
            var x = d.createElement('div'),
                y = d.body,
                z = x.style, w;
            y.appendChild(x);
            z.position = 'absolute';
            z.top = z.left = '-9999px';
            z.width = z.height = '100px';
            z.overflow = 'scroll';
            z.visibility = 'hidden';
            w = x.offsetWidth - x.clientWidth;
            y.removeChild(x);
            return w;
        })();

    $.type = ""; // default editor type
    $.x = '!$^*()-=+[]{}\\|:<>,./?'; // character(s) to escape

    function val() {
        return target.value.replace(/\r/g, "");
    }

    function is_set(x) {
        return typeof x !== "undefined";
    }

    function is_string(x) {
        return typeof x === "string";
    }

    function is_func(x) {
        return typeof x === "function";
    }

    function is_object(x) {
        return typeof x === "object";
    }

    function is_pattern(x) {
        return x instanceof RegExp && x.source ? x.source : false;
    }

    function is_node(x) {
        return x instanceof HTMLElement;
    }

    function get_pattern(x) {
        return is_pattern(x) || $._.x(x);
    }

    function edge(a, b, c) {
        if (a < b) return b;
        if (a > c) return c;
        return a;
    }

    function pattern(a, b) {
        return new RegExp(a, b);
    }

    function num(x) {
        return parseInt(x, 10);
    }

    function camelize(s) {
        return s.replace(/\-([a-z])/g, function(a, b) {
            return b.toUpperCase();
        });
    }
  
    function dasherize(s) {
        return s.replace(/([A-Z])/g, function(a, b) {
            return '-' + b.toLowerCase();
        });
    }

    function css(a, b) {
        var o = w.getComputedStyle(a, null),
            h = {}, i, j;
        return b ? (i = o[camelize(b)], j = num(i), j === 0 ? 0 : (j || i)) : (function() {
            for (i in o) {
                j = num(o[i]);
                h[dasherize(i)] = j === 0 ? 0 : (j || o[i]);
            }
            return h;
        })();
    }

    function extend(a, b) {
        b = b || {};
        for (var i in b) {
            if (is_object(a[i]) && is_object(b[i]) && !is_node(a[i]) && !is_node(b[i])) {
                a[i] = extend(a[i], b[i]);
            } else {
                a[i] = b[i];
            }
        }
        return a;
    }

    // <https://github.com/component/textarea-caret-position>
    function offset(x) {
        var font = 'font-',
            text = 'text-',
            padding = 'padding-',
            border = 'border-',
            prop = [
                'box-sizing',
                'direction',
                font + 'family',
                font + 'size',
                font + 'size-adjust',
                font + 'stretch',
                font + 'style',
                font + 'variant',
                font + 'weight',
                'height',
                'letter-spacing',
                'line-height',
                'overflow-x',
                padding + 'bottom',
                padding + 'left',
                padding + 'right',
                padding + 'top',
                'tab-size',
                text + 'align',
                text + 'decoration',
                text + 'indent',
                text + 'transform',
                'word-spacing'
            ];
        var b = d.body,
            i = prop.length,
            s, t, o, v, width;
        b.appendChild(div);
        s = div.style;
        t = css(target);
        width = t.width;
        s.whiteSpace = 'pre-wrap';
        s.wordWrap = 'break-word';
        s.position = 'absolute';
        s.visibility = 'hidden';
        while (--i) {
            v = t[prop[i]];
            s[camelize(prop[i])] = is_string(v) ? v : v + 'px';
        }
        s.overflowY = target.scrollHeight > t.height ? 'scroll' : 'auto';
        if (is_set(w.mozInnerScreenX)) { // Firefox :(
            s.width = width + 'px';
        } else {
            s.width = width + scroll_width + 'px';
        }
        span.textContent = val().substring(x) || '.';
        v = val().substring(0, x);
        div.textContent = v;
        div.appendChild(span);
        o = {
            x: span.offsetLeft + t[border + 'left-width'],
            y: span.offsetTop + t[border + 'top-width']
        };
        b.removeChild(div);
        return o;
    }

    // access editor instance from `this` scope with `this.TE`
    target.TE = $;

    // store editor instance to `TE.__instance__`
    TE.__instance__[target.id || target.name || Object.keys(TE.__instance__).length] = $;

    // scroll the editor
    $.scroll = function(i) {
        var current = target.scrollTop,
            h = css(target, 'line-height'),
            s = css(target, 'font-size');
        if (!is_set(i)) {
            return Math.floor(current / h);
        } else if (i === true || i === false) {
            return $.scroll($.scroll() + (i === false ? -1 : 1));
        }
        return target.scrollTop = (h * i) + (h - s), $;
    };

    // set value
    $.set = function(v) {
        return target.value = v, $;
    };

    // get value
    $.get = function(f) {
        if (is_set(f)) {
            return val().length ? val() : f;
        }
        return val();
    };

    // save state
    $.save = function(k, v) {
        return S[k] = v, $;
    };

    // restore state
    $.restore = function(k, f) {
        if (!is_set(k)) return S; // read all storage with `$.restore()`
        return is_set(S[k]) ? S[k] : (is_set(f) ? f : "");
    };

    // focus the editor
    $.focus = function(x, y) {
        if (x === true) {
            x = val().length; // put caret at the end of the editor
            y = target.scrollHeight; // scroll to the end of the editor
        } else if (x === false) {
            x = y = 0; // put caret at the start of the editor, scroll to the start of the editor
        }
        if (is_set(x)) {
            target.selectionStart = target.selectionEnd = x;
            target.scrollTop = y;
        }
        return target.focus(), $;
    };

    // blur the editor
    $.blur = function() {
        return target.blur(), $;
    };

    // get selection
    $.$ = function(O) {
        var v = val(),
            a = target.selectionStart,
            b = target.selectionEnd,
            c = v.substring(a, b),
            o = O ? [offset(a), offset(b)] : [];
        return {
            start: a,
            end: b,
            value: c,
            before: v.substring(0, a),
            after: v.substring(b),
            caret: o,
            length: c.length
        };
    };

    // select value
    $.select = function() {
        var arg = arguments,
            count = arg.length,
            a = d.documentElement,
            b = d.body,
            c = target,
            D = 'scrollTop',
            s = $.$(),
            id = 'TE.scroll', z;
        $.save(id, [a[D], b[D], c[D]]).focus();
        if (count === 0) { // restore selection with `$.select()`
            arg[0] = s.start;
            arg[1] = s.end;
        } else if (count === 1) { // move caret position with `$.select(7)`
            if (arg[0] === true) { // select all with `$.select(true)`
                return c.select(), $;
            }
            arg[1] = arg[0];
        }
        c.setSelectionRange(arg[0], arg[1]); // default `$.select(7, 100)`
        z = $.restore(id, [0, 0, 0]);
        a[D] = z[0];
        b[D] = z[1];
        c[D] = z[2];
        return $; // `select` method does not populate history data
    };

    // match selection
    $.match = function(a, b) {
        var m = $.$().value.match(a);
        return is_func(b) ? b(m || []) : !!m; // `match` method does not populate history data
    };

    // replace at selection
    $.replace = function(f, t, x) {
        var s = $.$(),
            a = s.before,
            b = s.after,
            c = s.value, d, e;
        if (x === -1) { // replace before
            a = a.replace(f, t);
        } else if (x === 1) { // replace after
            b = b.replace(f, t);
        } else {
            c = c.replace(f, t);
        }
        d = a.length;
        e = d + c.length;
        return $.set(a + c + b).select(d, e).record();
    };

    // replace before selection
    $.replaceBefore = function(f, t) {
        return $.replace(f, t, -1);
    };

    // replace after selection
    $.replaceAfter = function(f, t) {
        return $.replace(f, t, 1);
    };

    // insert/replace at caret
    $.insert = function(s, x, clear) {
        var f = /^[\s\S]*?$/;
        $[0]();
        if (clear) {
            $.replace(f, ""); // force to delete selection on insert before/after?
        }
        if (x === -1) { // insert before
            f = /$/;
        } else if (x === 1) { // insert after
            f = /^/;
        }
        return $.replace(f, s, x)[1]();
    };

    // insert before selection
    $.insertBefore = function(s, clear) {
        return $.insert(s, -1, clear);
    };

    // insert after selection
    $.insertAfter = function(s, clear) {
        return $.insert(s, 1, clear);
    };

    // wrap selection
    $.wrap = function(O, C, wrap) {
        var s = $.$(),
            a = s.before,
            b = s.after,
            c = s.value;
        if (wrap) {
            return $.replace(/^([\s\S]*?)$/, O + '$1' + C);
        }
        return $.set(a + O + c + C + b).select((a + O).length, (a + O + c).length).record();
    };

    // unwrap selection
    $.unwrap = function(O, C, wrap) {
        var s = $.$(),
            a = s.before,
            b = s.after,
            c = s.value,
            A, B, before, after;
        O = get_pattern(O);
        C = get_pattern(C);
        before = pattern(O + '$');
        after = pattern('^' + C);
        if (wrap) {
            return $.replace(pattern('^' + O + '([\\s\\S]*?)' + C + '$'), '$1');
        }
        if (before.test(a) && after.test(b)) {
            A = a.replace(before, "");
            B = b.replace(after, "");
            return $.set(A + c + B).select(A.length, (A + c).length).record();
        }
        return $.select();
    };

    // indent
    $.indent = function(B) {
        var s = $.$();
        B = is_set(B) ? B : tab;
        if (s.length) {
            return $.replace(/^(?!$)/gm, B);
        }
        return $.set(s.before + B + s.value + s.after).select(s.start + s.length).record();
    };

    // outdent
    $.outdent = function(B) {
        var s = $.$(), a;
        B = is_set(B) ? B : tab;
        B = get_pattern(B);
        if (s.length) {
            return s.replace(pattern('^' + B, 'gm'), "");
        }
        a = s.before.replace(pattern(B + '$'), "");
        return $.set(a + s.value + s.after).select(a.length).record();
    };

    // trim white-space before and after selection range
    $.trim = function(O, C, B, E) {
        if (O !== false) O = O || "";
        if (C !== false) C = C || "";
        if (B !== false) B = B || "";
        if (E !== false) E = E || "";
        var s = $.$(),
            a = s.before,
            b = s.after,
            c = s.value,
            aa = O !== false ? a.replace(/\s*$/, O) : a,
            bb = C !== false ? b.replace(/^\s*/, C) : b,
            cc = c.replace(/^(\s*)([\s\S]*?)(\s*)$/g, (B !== false ? B : '$1') + '$2' + (E !== false ? E : '$3'));
        return $.set(aa + cc + bb).select(aa.length, (aa + cc).length); // `trim` method does not populate history data
    };

    // toggle state
    $.toggle = function(a, b) {
        if (!is_set(b)) {
            return $.select();
        }
        if (a === true) {
            a = 0;
        } else if (a === false) {
            a = 1;
        }
        return is_func(b[a]) ? (b[a]($, a), $) : $.select();
    };

    // save state to history
    $.record = function(a, i) {
        if (F) return $;
        var o = H[I],
            s = $.$(),
            v = val(),
            w = s.start,
            x = s.end,
            a = is_set(a) ? a : [v, w, x, $.scroll()];
        if (o && is_object(o) && (
            o[0] === v &&
            o[1] === w &&
            o[2] === x
        )) return $; // prevent duplicate history data
        I++;
        H[is_set(i) ? i : I] = a;
        return _ = H.length, $;
    };

    // remove state from history
    $.loss = function(i) {
        if (i === true) { // clear all history with `$.loss(true)`
            H = [H[0]];
            I = 0;
            return $;
        }
        i = is_set(i) ? i : I;
        if (i <= I) {
            I--;
        }
        H.splice(i, 1);
        return _ = H.length, $;
    };

    // read history
    $.records = function(i, f) {
        if (!is_set(i)) return H; // read all history with `$.records()`
        return is_set(H[i]) ? H[i] : (is_set(f) ? f : false);
    };

    // undo
    $.undo = function() {
        I--;
        I = edge(I, 0, _ - 1);
        var a = H[I];
        return $.set(a[0]).select(a[1], a[2]).scroll(a[3]);
    };

    // redo
    $.redo = function() {
        I++;
        I = edge(I, 0, _ - 1);
        var a = H[I];
        return $.set(a[0]).select(a[1], a[2]).scroll(a[3]);
    };

    // utility ...
    $._ = {
        // escape regex character(s)
        x: function(x) {
            if (is_object(x)) {
                var o = [],
                    i = x.length;
                while (i--) o.unshift($._.x(x[i]));
                return o;
            }
            return x.replace(pattern('[' + $.x.replace(/./g, '\\$&') + ']', 'g'), '\\$&');
        },
        // extend object ...
        extend: extend,
        // iterate ...
        each: function(a, fn, num) {
            var i, j, k;
            if (num) {
                for (i = 0, j = a.length; i < j; ++i) {
                    k = fn(a[i], i, a);
                    if (k === true) {
                        continue;
                    } else if (k === false) {
                        break;
                    }
                }
            } else {
                for (i in a) {
                    k = fn(a[i], i, a);
                    if (k === true) {
                        continue;
                    } else if (k === false) {
                        break;
                    }
                }
            }
            return a;
        },
        css: css
    };

    // disable the history feature
    $[0] = function() {
        return F = 1, $;
    };

    // enable the history feature
    $[1] = function(x) {
        return F = 0, (x === false ? $ : $.record());
    };

    // the target element
    $.target = target;

    // return the global object
    return $;

});