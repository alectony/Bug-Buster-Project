/* A small interpreter for beginner Python: print, variables, numbers, text, lists,
   + - * / // % **, comparisons, and/or/not, if/elif/else, for, while, f-strings.
   It is NOT full Python. */
(function (global) {
  'use strict';

  const MAX_STEPS = 100000;
  const RESERVED = ['if', 'elif', 'else', 'for', 'while', 'in', 'def', 'class', 'return', 'import', 'from', 'and', 'or', 'not', 'break', 'continue', 'pass'];

  class PyError extends Error { constructor(m, line) { super(m); this.line = line || 0; } }
  class PyFloat { constructor(v) { this.v = v; } }

  const isNum = (x) => typeof x === 'number' || x instanceof PyFloat;
  const nv = (x) => (x instanceof PyFloat ? x.v : x);
  const mk = (v, a, b) => (a instanceof PyFloat || b instanceof PyFloat ? new PyFloat(v) : v);

  function typeName(x) {
    if (x === null || x === undefined) return 'None';
    if (x instanceof PyFloat) return 'a decimal number';
    if (typeof x === 'number') return 'a whole number';
    if (typeof x === 'string') return 'text';
    if (typeof x === 'boolean') return 'True/False';
    if (Array.isArray(x)) return 'a list';
    return 'a value';
  }

  function repr(x) {
    if (typeof x === 'string') return "'" + x.replace(/\\/g, '\\\\').replace(/'/g, "\\'").replace(/\n/g, '\\n') + "'";
    return str(x);
  }
  function str(x) {
    if (x === null || x === undefined) return 'None';
    if (x === true) return 'True';
    if (x === false) return 'False';
    if (x instanceof PyFloat) return Number.isInteger(x.v) && Math.abs(x.v) < 1e16 ? x.v.toFixed(1) : String(x.v);
    if (Array.isArray(x)) return '[' + x.map(repr).join(', ') + ']';
    return String(x);
  }
  function truthy(x) {
    if (x === null || x === undefined) return false;
    if (Array.isArray(x)) return x.length > 0;
    if (isNum(x)) return nv(x) !== 0;
    if (typeof x === 'string') return x.length > 0;
    return !!x;
  }
  function eq(a, b) {
    if (isNum(a) && isNum(b)) return nv(a) === nv(b);
    if (Array.isArray(a) && Array.isArray(b)) return a.length === b.length && a.every((v, i) => eq(v, b[i]));
    return a === b;
  }
  const unesc = (s) => s.replace(/\\(.)/g, (m, c) => ({ n: '\n', t: '\t', '\\': '\\', "'": "'", '"': '"' }[c] ?? '\\' + c));

  /* ---------- tokenizer ---------- */
  function readString(src, i, line) {
    const quote = src[i];
    let j = i + 1;
    while (j < src.length && src[j] !== quote) { if (src[j] === '\\') j++; j++; }
    if (j >= src.length) throw new PyError('This text is missing its closing quote (' + quote + ')', line);
    return [src.slice(i + 1, j), j + 1];
  }

  function tokenize(src, line) {
    const toks = [];
    const n = src.length;
    const two = ['**', '//', '==', '!=', '<=', '>=', '+=', '-=', '*=', '/=', '%='];
    let i = 0;
    while (i < n) {
      const c = src[i];
      if (c === ' ' || c === '\t') { i++; continue; }
      if (/\d/.test(c) || (c === '.' && /\d/.test(src[i + 1] || ''))) {
        let j = i;
        while (j < n && /[\d.]/.test(src[j])) j++;
        const txt = src.slice(i, j);
        if ((txt.match(/\./g) || []).length > 1) throw new PyError('That number has too many dots: ' + txt, line);
        toks.push({ t: 'lit', v: txt.includes('.') ? new PyFloat(parseFloat(txt)) : parseInt(txt, 10) });
        i = j; continue;
      }
      if (/[A-Za-z_]/.test(c)) {
        let j = i;
        while (j < n && /\w/.test(src[j])) j++;
        const w = src.slice(i, j);
        if ((w === 'f' || w === 'F') && (src[j] === '"' || src[j] === "'")) {
          const [s, end] = readString(src, j, line);
          toks.push({ t: 'fstr', v: s }); i = end; continue;
        }
        toks.push({ t: 'name', v: w }); i = j; continue;
      }
      if (c === '"' || c === "'") {
        const [s, end] = readString(src, i, line);
        toks.push({ t: 'lit', v: unesc(s) }); i = end; continue;
      }
      const pair = src.slice(i, i + 2);
      if (two.includes(pair)) { toks.push({ t: 'op', v: pair }); i += 2; continue; }
      if ('+-*/%<>()[],.:='.includes(c)) { toks.push({ t: 'op', v: c }); i++; continue; }
      throw new PyError('I don\'t understand the character "' + c + '"', line);
    }
    return toks;
  }

  /* ---------- expression parser ---------- */
  class Parser {
    constructor(toks, line) { this.t = toks; this.p = 0; this.line = line; }
    peek() { return this.t[this.p]; }
    next() { return this.t[this.p++]; }
    atEnd() { return this.p >= this.t.length; }
    isOp(v) { const k = this.peek(); return !!k && k.t === 'op' && k.v === v; }
    isName(v) { const k = this.peek(); return !!k && k.t === 'name' && k.v === v; }
    expectOp(v) {
      if (!this.isOp(v)) throw new PyError('I expected "' + v + '" here. Check for a missing bracket or comma.', this.line);
      return this.next();
    }
    parseExpr() { return this.parseOr(); }
    parseOr() {
      let l = this.parseAnd();
      while (this.isName('or')) { this.next(); l = { t: 'logic', op: 'or', l, r: this.parseAnd() }; }
      return l;
    }
    parseAnd() {
      let l = this.parseNot();
      while (this.isName('and')) { this.next(); l = { t: 'logic', op: 'and', l, r: this.parseNot() }; }
      return l;
    }
    parseNot() {
      if (this.isName('not') && !(this.t[this.p + 1] && this.t[this.p + 1].v === 'in')) { this.next(); return { t: 'not', e: this.parseNot() }; }
      return this.parseCmp();
    }
    parseCmp() {
      let l = this.parseAdd();
      for (;;) {
        const k = this.peek();
        let op = null;
        if (k && k.t === 'op' && ['==', '!=', '<', '>', '<=', '>='].includes(k.v)) { op = k.v; this.next(); }
        else if (this.isName('in')) { op = 'in'; this.next(); }
        else if (this.isName('not') && this.t[this.p + 1] && this.t[this.p + 1].v === 'in') { op = 'not in'; this.p += 2; }
        else break;
        l = { t: 'bin', op, l, r: this.parseAdd() };
      }
      return l;
    }
    parseAdd() {
      let l = this.parseMul();
      while (this.isOp('+') || this.isOp('-')) { const op = this.next().v; l = { t: 'bin', op, l, r: this.parseMul() }; }
      return l;
    }
    parseMul() {
      let l = this.parseUnary();
      while (['*', '/', '//', '%'].some((o) => this.isOp(o))) { const op = this.next().v; l = { t: 'bin', op, l, r: this.parseUnary() }; }
      return l;
    }
    parseUnary() {
      if (this.isOp('-')) { this.next(); return { t: 'neg', e: this.parseUnary() }; }
      if (this.isOp('+')) { this.next(); return this.parseUnary(); }
      return this.parsePow();
    }
    parsePow() {
      const l = this.parsePostfix();
      if (this.isOp('**')) { this.next(); return { t: 'bin', op: '**', l, r: this.parseUnary() }; }
      return l;
    }
    parsePostfix() {
      let e = this.parseAtom();
      for (;;) {
        if (this.isOp('(')) {
          this.next();
          const args = []; const kw = {};
          while (!this.isOp(')')) {
            const k = this.peek(); const k2 = this.t[this.p + 1];
            if (k && k.t === 'name' && k2 && k2.t === 'op' && k2.v === '=') { this.p += 2; kw[k.v] = this.parseExpr(); }
            else args.push(this.parseExpr());
            if (this.isOp(',')) this.next(); else break;
          }
          this.expectOp(')');
          e = { t: 'call', f: e, args, kw };
        } else if (this.isOp('[')) {
          this.next(); const idx = this.parseExpr(); this.expectOp(']');
          e = { t: 'index', obj: e, idx };
        } else if (this.isOp('.')) {
          this.next(); const nm = this.next();
          if (!nm || nm.t !== 'name') throw new PyError('I expected a method name after the dot', this.line);
          e = { t: 'attr', obj: e, name: nm.v };
        } else break;
      }
      return e;
    }
    parseAtom() {
      const k = this.next();
      if (!k) throw new PyError('This line ends too early. Is something missing after the last symbol?', this.line);
      if (k.t === 'lit') return { t: 'lit', v: k.v };
      if (k.t === 'fstr') return parseFstr(k.v, this.line);
      if (k.t === 'name') {
        if (k.v === 'True') return { t: 'lit', v: true };
        if (k.v === 'False') return { t: 'lit', v: false };
        if (k.v === 'None') return { t: 'lit', v: null };
        if (RESERVED.includes(k.v)) throw new PyError('I didn\'t expect the word "' + k.v + '" here', this.line);
        return { t: 'name', v: k.v };
      }
      if (k.v === '(') { const e = this.parseExpr(); this.expectOp(')'); return e; }
      if (k.v === '[') {
        const items = [];
        while (!this.isOp(']')) { items.push(this.parseExpr()); if (this.isOp(',')) this.next(); else break; }
        this.expectOp(']');
        return { t: 'list', items };
      }
      throw new PyError('I didn\'t expect "' + k.v + '" here', this.line);
    }
  }

  function parseFstr(raw, line) {
    const parts = [];
    let buf = '';
    for (let i = 0; i < raw.length; i++) {
      const c = raw[i];
      if (c === '{' && raw[i + 1] === '{') { buf += '{'; i++; }
      else if (c === '}' && raw[i + 1] === '}') { buf += '}'; i++; }
      else if (c === '{') {
        const end = raw.indexOf('}', i);
        if (end < 0) throw new PyError('An f-string is missing its closing }', line);
        if (buf) { parts.push(unesc(buf)); buf = ''; }
        let src = raw.slice(i + 1, end);
        let digits = null;
        const m = src.match(/^(.*):\.(\d+)f$/);
        if (m) { src = m[1]; digits = parseInt(m[2], 10); }
        const p = new Parser(tokenize(src, line), line);
        const node = p.parseExpr();
        if (!p.atEnd()) throw new PyError('I could not read what is inside { } in the f-string', line);
        parts.push(digits === null ? node : { t: 'fmt', e: node, digits });
        i = end;
      } else buf += c;
    }
    if (buf) parts.push(unesc(buf));
    return { t: 'fstr', parts };
  }

  /* ---------- statements ---------- */
  function stripComment(s) {
    let q = null;
    for (let i = 0; i < s.length; i++) {
      const c = s[i];
      if (q) { if (c === '\\') i++; else if (c === q) q = null; }
      else if (c === '"' || c === "'") q = c;
      else if (c === '#') return s.slice(0, i);
    }
    return s;
  }

  function prepare(code) {
    const lines = [];
    String(code).replace(/\r/g, '').split('\n').forEach((raw, idx) => {
      const s = stripComment(raw);
      if (!s.trim()) return;
      const lead = s.match(/^[ \t]*/)[0].replace(/\t/g, '    ').length;
      lines.push({ indent: lead, text: s.trim(), line: idx + 1 });
    });
    return lines;
  }

  function headerExpr(L, kw) {
    if (!L.text.endsWith(':')) throw new PyError('"' + kw + '" lines need a colon (:) at the end', L.line);
    const p = new Parser(tokenize(L.text.slice(kw.length, -1), L.line), L.line);
    const e = p.parseExpr();
    if (p.isOp('=')) throw new PyError('Use == to compare two values. A single = stores a value.', L.line);
    if (!p.atEnd()) throw new PyError('I could not understand the end of this "' + kw + '" line', L.line);
    return e;
  }

  function parseBody(lines, st, indent, L) {
    if (st.i >= lines.length || lines[st.i].indent <= indent) {
      throw new PyError('Indent the lines under "' + L.text.split(' ')[0].replace(':', '') + '" by 4 spaces', L.line);
    }
    return parseBlock(lines, st, lines[st.i].indent);
  }

  function parseBlock(lines, st, indent) {
    const out = [];
    while (st.i < lines.length) {
      const L = lines[st.i];
      if (L.indent < indent) break;
      if (L.indent > indent) throw new PyError('This line is indented more than the line above it', L.line);
      out.push(parseStatement(lines, st, indent));
    }
    return out;
  }

  function parseStatement(lines, st, indent) {
    const L = lines[st.i];
    const kw = L.text.split(/[\s:(]/)[0];
    if (kw === 'if') {
      st.i++;
      const node = { t: 'if', line: L.line, branches: [], orelse: null };
      node.branches.push({ cond: headerExpr(L, 'if'), body: parseBody(lines, st, indent, L) });
      for (;;) {
        const N = lines[st.i];
        if (!N || N.indent !== indent) break;
        if (N.text.startsWith('elif ')) {
          st.i++;
          node.branches.push({ cond: headerExpr(N, 'elif'), body: parseBody(lines, st, indent, N) });
        } else if (N.text === 'else:') {
          st.i++;
          node.orelse = parseBody(lines, st, indent, N);
          break;
        } else break;
      }
      return node;
    }
    if (kw === 'for') {
      const m = L.text.match(/^for\s+([A-Za-z_]\w*)\s+in\s+(.+):$/);
      if (!m) throw new PyError('A for line looks like: for item in range(3):', L.line);
      const p = new Parser(tokenize(m[2], L.line), L.line);
      const iter = p.parseExpr();
      if (!p.atEnd()) throw new PyError('I could not understand the end of this "for" line', L.line);
      st.i++;
      return { t: 'for', line: L.line, v: m[1], iter, body: parseBody(lines, st, indent, L) };
    }
    if (kw === 'while') {
      const cond = headerExpr(L, 'while');
      st.i++;
      return { t: 'while', line: L.line, cond, body: parseBody(lines, st, indent, L) };
    }
    if (kw === 'elif' || kw === 'else') throw new PyError('"' + kw + '" needs an "if" line right above it', L.line);
    if (['def', 'class', 'import', 'from', 'return', 'try', 'with', 'lambda'].includes(kw)) {
      throw new PyError('"' + kw + '" isn\'t available in the garden checker yet', L.line);
    }
    st.i++;
    if (['pass', 'break', 'continue'].includes(L.text)) return { t: L.text, line: L.line };
    const toks = tokenize(L.text, L.line);
    if (toks[0] && toks[0].v === 'print' && toks[1] && toks[1].v !== '(' && toks[1].v !== '=') {
      throw new PyError('print needs parentheses: print("hello")', L.line);
    }
    const p = new Parser(toks, L.line);
    const target = p.parseExpr();
    const k = p.peek();
    if (k && k.t === 'op' && ['=', '+=', '-=', '*=', '/=', '%='].includes(k.v)) {
      p.next();
      if (target.t !== 'name' && target.t !== 'index') throw new PyError('You can only store a value in a name, like score = 5', L.line);
      const value = p.parseExpr();
      if (!p.atEnd()) throw new PyError('I could not understand the end of this line', L.line);
      return { t: 'assign', line: L.line, target, op: k.v, value };
    }
    if (!p.atEnd()) throw new PyError('I could not understand the end of this line. Is a comma, quote or bracket missing?', L.line);
    return { t: 'expr', line: L.line, e: target };
  }

  /* ---------- evaluation ---------- */
  function binop(op, a, b) {
    if (op === '+') {
      if (isNum(a) && isNum(b)) return mk(nv(a) + nv(b), a, b);
      if (typeof a === 'string' && typeof b === 'string') return a + b;
      if (Array.isArray(a) && Array.isArray(b)) return a.concat(b);
      throw new PyError('You can\'t add ' + typeName(a) + ' and ' + typeName(b) + '. Use str() to turn a number into text.');
    }
    if (op === '*') {
      if (isNum(a) && isNum(b)) return mk(nv(a) * nv(b), a, b);
      if (typeof a === 'string' && typeof b === 'number') return b > 0 ? a.repeat(Math.min(b, 1000)) : '';
      if (typeof b === 'string' && typeof a === 'number') return a > 0 ? b.repeat(Math.min(a, 1000)) : '';
      if (Array.isArray(a) && typeof b === 'number') { let r = []; for (let i = 0; i < Math.min(b, 1000); i++) r = r.concat(a); return r; }
      throw new PyError('You can\'t multiply ' + typeName(a) + ' by ' + typeName(b));
    }
    if (!isNum(a) || !isNum(b)) throw new PyError('"' + op + '" only works on numbers, but this has ' + typeName(a) + ' and ' + typeName(b));
    const x = nv(a), y = nv(b);
    switch (op) {
      case '-': return mk(x - y, a, b);
      case '/': if (y === 0) throw new PyError('You can\'t divide by zero'); return new PyFloat(x / y);
      case '//': if (y === 0) throw new PyError('You can\'t divide by zero'); return mk(Math.floor(x / y), a, b);
      case '%': if (y === 0) throw new PyError('You can\'t divide by zero'); return mk(((x % y) + y) % y, a, b);
      case '**': { const r = Math.pow(x, y); return (a instanceof PyFloat || b instanceof PyFloat || y < 0) ? new PyFloat(r) : r; }
    }
    throw new PyError('Unknown operator ' + op);
  }

  function compare(op, a, b) {
    if (op === '==') return eq(a, b);
    if (op === '!=') return !eq(a, b);
    if (op === 'in' || op === 'not in') {
      let r;
      if (typeof b === 'string' && typeof a === 'string') r = b.includes(a);
      else if (Array.isArray(b)) r = b.some((v) => eq(v, a));
      else throw new PyError('"in" works with text or lists');
      return op === 'in' ? r : !r;
    }
    let x, y;
    if (isNum(a) && isNum(b)) { x = nv(a); y = nv(b); }
    else if (typeof a === 'string' && typeof b === 'string') { x = a; y = b; }
    else throw new PyError('You can\'t compare ' + typeName(a) + ' with ' + typeName(b));
    return op === '<' ? x < y : op === '>' ? x > y : op === '<=' ? x <= y : x >= y;
  }

  function idx(obj, i) {
    if (typeof i !== 'number') throw new PyError('List and text positions must be whole numbers');
    if (!Array.isArray(obj) && typeof obj !== 'string') throw new PyError('You can only use [ ] on a list or text');
    const k = i < 0 ? obj.length + i : i;
    if (k < 0 || k >= obj.length) throw new PyError('Position ' + i + ' is outside this list (it has ' + obj.length + ' items, starting at 0)');
    return k;
  }

  const BUILTINS = {
    print(args, kw, ctx) {
      const sep = kw.sep === undefined ? ' ' : str(kw.sep);
      const end = kw.end === undefined ? '\n' : str(kw.end);
      ctx.buf += args.map(str).join(sep) + end;
      return null;
    },
    len(a) {
      if (typeof a[0] === 'string' || Array.isArray(a[0])) return a[0].length;
      throw new PyError('len() works on text or lists');
    },
    range(a) {
      const n = a.map((x) => { if (typeof x !== 'number') throw new PyError('range() needs whole numbers'); return x; });
      let start = 0, stop, step = 1;
      if (n.length === 1) stop = n[0]; else if (n.length === 2) [start, stop] = n; else if (n.length === 3) [start, stop, step] = n;
      else throw new PyError('range() takes 1 to 3 numbers');
      if (step === 0) throw new PyError('range() step cannot be 0');
      const out = [];
      for (let i = start; step > 0 ? i < stop : i > stop; i += step) { out.push(i); if (out.length > 100000) throw new PyError('That range is too big'); }
      return out;
    },
    str(a) { return str(a[0]); },
    int(a) {
      const v = a[0];
      if (isNum(v)) return Math.trunc(nv(v));
      if (typeof v === 'string' && /^\s*[-+]?\d+\s*$/.test(v)) return parseInt(v, 10);
      throw new PyError('I can\'t turn ' + repr(v) + ' into a whole number');
    },
    float(a) {
      const v = a[0];
      if (isNum(v)) return new PyFloat(nv(v));
      if (typeof v === 'string' && /^\s*[-+]?(\d+\.?\d*|\.\d+)\s*$/.test(v)) return new PyFloat(parseFloat(v));
      throw new PyError('I can\'t turn ' + repr(v) + ' into a decimal number');
    },
    abs(a) { return isNum(a[0]) ? mk(Math.abs(nv(a[0])), a[0]) : (() => { throw new PyError('abs() needs a number'); })(); },
    round(a) {
      if (!isNum(a[0])) throw new PyError('round() needs a number');
      if (a.length > 1) { const f = Math.pow(10, a[1]); return new PyFloat(Math.round(nv(a[0]) * f) / f); }
      return Math.round(nv(a[0]));
    },
    min(a) { const l = a.length === 1 ? a[0] : a; return l.reduce((m, v) => (compare('<', v, m) ? v : m)); },
    max(a) { const l = a.length === 1 ? a[0] : a; return l.reduce((m, v) => (compare('>', v, m) ? v : m)); },
    sum(a) { return a[0].reduce((s, v) => binop('+', s, v), 0); },
    sorted(a) { return a[0].slice().sort((x, y) => (compare('<', x, y) ? -1 : compare('>', x, y) ? 1 : 0)); },
  };

  function callMethod(obj, name, args) {
    if (Array.isArray(obj)) {
      if (name === 'append') { obj.push(args[0]); return null; }
      if (name === 'pop') { if (!obj.length) throw new PyError('You can\'t pop from an empty list'); return args.length ? obj.splice(idx(obj, args[0]), 1)[0] : obj.pop(); }
      if (name === 'sort') { obj.sort((x, y) => (compare('<', x, y) ? -1 : compare('>', x, y) ? 1 : 0)); return null; }
      if (name === 'reverse') { obj.reverse(); return null; }
    }
    if (typeof obj === 'string') {
      if (name === 'upper') return obj.toUpperCase();
      if (name === 'lower') return obj.toLowerCase();
      if (name === 'strip') return obj.trim();
      if (name === 'title') return obj.replace(/\b\w/g, (c) => c.toUpperCase());
      if (name === 'replace') return obj.split(args[0]).join(args[1]);
    }
    throw new PyError(typeName(obj) + ' has no ".' + name + '()" in the garden checker');
  }

  function ev(n, env, ctx) {
    switch (n.t) {
      case 'lit': return n.v;
      case 'name':
        if (n.v in env) return env[n.v];
        throw new PyError('I don\'t know the name "' + n.v + '" yet. Did you create it with = first? Check the spelling and capital letters.');
      case 'list': return n.items.map((e) => ev(e, env, ctx));
      case 'fstr': return n.parts.map((p) => (typeof p === 'string' ? p : str(ev(p, env, ctx)))).join('');
      case 'fmt': { const v = ev(n.e, env, ctx); if (!isNum(v)) throw new PyError('Only numbers can use :.2f'); return nv(v).toFixed(n.digits); }
      case 'neg': { const v = ev(n.e, env, ctx); if (!isNum(v)) throw new PyError('You can only put a minus sign before a number'); return v instanceof PyFloat ? new PyFloat(-v.v) : -v; }
      case 'not': return !truthy(ev(n.e, env, ctx));
      case 'logic': { const l = ev(n.l, env, ctx); return n.op === 'and' ? (truthy(l) ? ev(n.r, env, ctx) : l) : (truthy(l) ? l : ev(n.r, env, ctx)); }
      case 'bin': {
        const a = ev(n.l, env, ctx), b = ev(n.r, env, ctx);
        return ['==', '!=', '<', '>', '<=', '>=', 'in', 'not in'].includes(n.op) ? compare(n.op, a, b) : binop(n.op, a, b);
      }
      case 'index': { const o = ev(n.obj, env, ctx); return o[idx(o, ev(n.idx, env, ctx))]; }
      case 'attr': throw new PyError('Add ( ) after .' + n.name + ' to use it');
      case 'call': {
        const args = n.args.map((e) => ev(e, env, ctx));
        const kw = {};
        Object.keys(n.kw).forEach((k) => { kw[k] = ev(n.kw[k], env, ctx); });
        if (n.f.t === 'name') {
          const fn = BUILTINS[n.f.v];
          if (!fn) throw new PyError(n.f.v in env ? '"' + n.f.v + '" is a value, not a function' : 'I don\'t know a function called "' + n.f.v + '"');
          return fn(args, kw, ctx);
        }
        if (n.f.t === 'attr') return callMethod(ev(n.f.obj, env, ctx), n.f.name, args);
        throw new PyError('That can\'t be called like a function');
      }
    }
    throw new PyError('Unsupported expression');
  }

  function tick(ctx) {
    if (++ctx.steps > MAX_STEPS) throw new PyError('This ran for too long. Is there a loop that never ends?');
  }

  function execBlock(stmts, env, ctx) {
    for (const s of stmts) {
      const r = exec(s, env, ctx);
      if (r) return r;
    }
    return null;
  }

  function exec(s, env, ctx) {
    ctx.line = s.line; tick(ctx);
    switch (s.t) {
      case 'pass': return null;
      case 'break': return 'break';
      case 'continue': return 'continue';
      case 'expr': ev(s.e, env, ctx); return null;
      case 'assign': {
        let v = ev(s.value, env, ctx);
        if (s.op !== '=') v = binop(s.op[0], ev(s.target, env, ctx), v);
        if (s.target.t === 'name') env[s.target.v] = v;
        else { const o = ev(s.target.obj, env, ctx); if (!Array.isArray(o)) throw new PyError('You can only change items inside a list'); o[idx(o, ev(s.target.idx, env, ctx))] = v; }
        return null;
      }
      case 'if':
        for (const b of s.branches) if (truthy(ev(b.cond, env, ctx))) return execBlock(b.body, env, ctx);
        return s.orelse ? execBlock(s.orelse, env, ctx) : null;
      case 'for': {
        const it = ev(s.iter, env, ctx);
        if (typeof it !== 'string' && !Array.isArray(it)) throw new PyError('A for loop needs a list, text or range(...) after "in"');
        for (const item of Array.from(it)) {
          env[s.v] = item; tick(ctx);
          const r = execBlock(s.body, env, ctx);
          if (r === 'break') break;
        }
        return null;
      }
      case 'while':
        while (truthy(ev(s.cond, env, ctx))) {
          tick(ctx);
          const r = execBlock(s.body, env, ctx);
          if (r === 'break') break;
          ctx.line = s.line;
        }
        return null;
    }
    return null;
  }

  function run(code) {
    const ctx = { buf: '', steps: 0, line: 0 };
    const finish = (error) => {
      const out = ctx.buf.split('\n');
      if (out[out.length - 1] === '') out.pop();
      return { output: out, error };
    };
    try {
      const lines = prepare(code);
      const st = { i: 0 };
      const prog = parseBlock(lines, st, 0);
      execBlock(prog, Object.create(null), ctx);
      return finish(null);
    } catch (e) {
      if (e instanceof PyError) return finish({ line: e.line || ctx.line, message: e.message });
      return finish({ line: ctx.line, message: 'Something unexpected went wrong: ' + e.message });
    }
  }

  const squash = (s) => String(s).replace(/\s+/g, '');

  /** rules: { expected_output, mustContain: [], hint } */
  function check(code, rules) {
    const res = run(code);
    const messages = [];
    if (res.error) return { passed: false, result: res, messages: ['Fix the error first, then check again.'] };
    if (rules && typeof rules.expected_output === 'string' && rules.expected_output.trim() !== '') {
      const want = rules.expected_output.replace(/\r/g, '').trim();
      const got = res.output.join('\n').trim();
      if (got !== want) messages.push('The console should show:\n' + want + '\n\nYours shows:\n' + (got || '(nothing)'));
    }
    const squashed = squash(code);
    ((rules && rules.mustContain) || []).forEach((frag) => {
      if (!squashed.includes(squash(frag))) messages.push('Your code should use ' + frag);
    });
    return { passed: messages.length === 0, result: res, messages };
  }

  global.PyRunner = { run, check };
})(window);
