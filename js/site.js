/* =========================================================
   MF Capital — interações e animações
   Sem bibliotecas: IntersectionObserver para entrar/sair,
   um único laço de requestAnimationFrame para o que depende
   de rolagem e de mouse (parallax, cursor, cabeçalho).
   ========================================================= */
(() => {
  'use strict';

  const doc = document.documentElement;
  const reduz = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const fino = matchMedia('(hover: hover) and (pointer: fine)').matches;
  const $ = (s, c = document) => c.querySelector(s);
  const $$ = (s, c = document) => [...c.querySelectorAll(s)];
  const limita = (v, a, b) => Math.min(b, Math.max(a, v));
  const lerp = (a, b, t) => a + (b - a) * t;
  const suave = (t) => 1 - Math.pow(1 - t, 3);
  const brl = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 });
  const milhar = new Intl.NumberFormat('pt-BR', { maximumFractionDigits: 0 });
  const EMAIL = 'mf.negociosecapital@gmail.com';

  /* ---------- Aviso rápido (toast) ---------- */
  const toast = $('.toast');
  let toastT;
  function avisa(txt) {
    toast.textContent = txt;
    toast.classList.add('mostra');
    clearTimeout(toastT);
    toastT = setTimeout(() => toast.classList.remove('mostra'), 2600);
  }

  async function copia(txt) {
    try {
      await navigator.clipboard.writeText(txt);
    } catch {
      const t = document.createElement('textarea');
      t.value = txt; t.style.position = 'fixed'; t.style.opacity = '0';
      document.body.appendChild(t); t.select();
      try { document.execCommand('copy'); } catch { /* sem suporte */ }
      t.remove();
    }
  }

  /* ---------- Divide títulos em palavras ---------- */
  function divide(el) {
    // pontuação logo depois de um <em> entra no <em> para não quebrar sozinha na linha
    $$('em', el).forEach((em) => {
      const n = em.nextSibling;
      if (n && n.nodeType === 3 && /^[.,;:!?]+/.test(n.textContent)) {
        const p = n.textContent.match(/^[.,;:!?]+/)[0];
        em.append(p);
        n.textContent = n.textContent.slice(p.length);
      }
    });
    let i = 0;
    const anda = (no) => {
      [...no.childNodes].forEach((n) => {
        if (n.nodeType === 3) {
          const frag = document.createDocumentFragment();
          n.textContent.split(/(\s+)/).forEach((pedaco) => {
            if (!pedaco) return;
            if (/^\s+$/.test(pedaco)) { frag.append(' '); return; }
            const w = document.createElement('span');
            w.className = 'w';
            const wi = document.createElement('span');
            wi.className = 'wi';
            wi.textContent = pedaco;
            wi.style.setProperty('--i', i++);
            w.append(wi);
            frag.append(w);
          });
          n.replaceWith(frag);
        } else if (n.nodeType === 1) {
          anda(n);
        }
      });
    };
    anda(el);
  }
  $$('[data-split]').forEach(divide);

  /* ---------- Entrar e sair da tela (fade in / fade out) ---------- */
  const obsRevela = new IntersectionObserver((entradas) => {
    entradas.forEach((e) => {
      const el = e.target;
      if (e.isIntersecting) {
        el.classList.add('visivel');
        el.classList.remove('saiu-cima');
        if (el._aoEntrar) el._aoEntrar();
      } else {
        el.classList.remove('visivel');
        el.classList.toggle('saiu-cima', e.boundingClientRect.top < 0);
      }
    });
  }, { rootMargin: '-7% 0px -7% 0px', threshold: 0 });

  function ligaRevelacoes() {
    $$('[data-reveal], [data-split]').forEach((el) => {
      if (el.closest('.hero')) return; // o hero tem coreografia própria
      obsRevela.observe(el);
    });
  }

  /* ---------- Contadores ---------- */
  function conta(el) {
    const alvo = Number(el.dataset.contar);
    const dur = 1400;
    const t0 = performance.now();
    const passo = (t) => {
      const p = limita((t - t0) / dur, 0, 1);
      el.textContent = Math.round(alvo * suave(p));
      if (p < 1) requestAnimationFrame(passo);
    };
    requestAnimationFrame(passo);
  }

  /* ---------- Abertura (loader) ---------- */
  const loaderNum = $('.loader-num');
  const loaderLinha = $('.loader-linha span');
  let carregou = false;
  let mostrado = 0;
  const inicio = performance.now();
  addEventListener('load', () => { carregou = true; });
  setTimeout(() => { carregou = true; }, 4500); // nunca prende o visitante

  function terminaAbertura() {
    doc.classList.add('pronto');
    doc.classList.remove('carregando');
    setTimeout(() => doc.classList.add('loader-fim'), 1500);
    ligaRevelacoes();
    setTimeout(() => $$('.hero [data-contar]').forEach(conta), 1500);
    $$('.segmentado').forEach(posPilula);
    posAbas();
  }

  function abertura(t) {
    const tempo = t - inicio;
    const alvo = carregou ? 100 : Math.min(88, tempo / 16);
    mostrado = lerp(mostrado, alvo, carregou ? 0.12 : 0.06);
    loaderNum.textContent = Math.round(mostrado);
    loaderLinha.style.setProperty('--p', (mostrado / 100).toFixed(3));
    if (mostrado > 99.4 && tempo > 1500) {
      loaderNum.textContent = '100';
      loaderLinha.style.setProperty('--p', 1);
      setTimeout(terminaAbertura, 180);
      return;
    }
    requestAnimationFrame(abertura);
  }
  if (reduz) {
    terminaAbertura();
  } else {
    requestAnimationFrame(abertura);
  }

  /* ---------- Espaços de imagem: carregam se o arquivo existir ---------- */
  $$('.foto[data-foto]').forEach((fig) => {
    const base = fig.dataset.foto;
    const exts = ['.webp', '.jpg', '.jpeg', '.png'];
    const tenta = (i) => {
      if (i >= exts.length) return; // fica em branco
      const img = new Image();
      img.alt = '';
      img.decoding = 'async';
      img.onload = () => {
        $('.foto-moldura', fig).append(img);
        requestAnimationFrame(() => fig.classList.add('tem-foto'));
      };
      img.onerror = () => tenta(i + 1);
      img.src = base + exts[i];
    };
    tenta(0);
  });

  /* ---------- Cabeçalho, navegação, menu ---------- */
  const topo = $('.topo');
  const navLinks = $$('.topo-nav a');
  const navMarca = $('.topo-nav-marca');
  const temas = $$('[data-tema]').filter((el) => el !== topo);
  const secoesNav = navLinks.map((a) => $(a.getAttribute('href'))).filter(Boolean);
  let linkAtivo = null;

  function marcaNav(a) {
    if (!a) { navMarca.style.opacity = '0'; return; }
    navMarca.style.opacity = '1';
    navMarca.style.left = a.offsetLeft + 12 + 'px';
    navMarca.style.width = a.offsetWidth - 24 + 'px';
  }
  navLinks.forEach((a) => {
    a.addEventListener('mouseenter', () => marcaNav(a));
    a.addEventListener('mouseleave', () => marcaNav(linkAtivo));
  });

  const botaoMenu = $('.topo-menu');
  const menuMovel = $('#menu-movel');
  function abreMenu(abrir) {
    if (abrir) {
      menuMovel.hidden = false;
      requestAnimationFrame(() => doc.classList.add('menu-aberto'));
    } else {
      doc.classList.remove('menu-aberto');
      setTimeout(() => { if (!doc.classList.contains('menu-aberto')) menuMovel.hidden = true; }, 900);
    }
    botaoMenu.setAttribute('aria-expanded', String(abrir));
    botaoMenu.setAttribute('aria-label', abrir ? 'Fechar menu' : 'Abrir menu');
  }
  botaoMenu.addEventListener('click', () => abreMenu(!doc.classList.contains('menu-aberto')));
  $$('#menu-movel a').forEach((a) => a.addEventListener('click', () => abreMenu(false)));
  addEventListener('keydown', (e) => { if (e.key === 'Escape' && doc.classList.contains('menu-aberto')) abreMenu(false); });

  /* ---------- Laço único: rolagem + mouse ---------- */
  const progresso = $('.progresso span');
  const parallax = $$('[data-parallax]').map((el) => ({ el, vel: Number(el.dataset.parallax), pai: el.parentElement }));
  const heroGrade = $('.hero-grade');
  const heroFoto = $('.hero-foto');
  const camadas = $$('[data-profundidade]').map((el) => ({ el, k: Number(el.dataset.profundidade) }));
  const heroLuz = $('.hero');
  const linhaTempo = $('.linha-tempo');
  const voltar = $('.voltar-topo');
  const barraMovel = $('.barra-movel');
  const contato = $('#contato');

  let vh = innerHeight;
  let yAnt = scrollY;
  let yTopo = scrollY;
  let mx = innerWidth / 2, my = innerHeight / 2;           // mouse
  let ax = mx, ay = my;                                     // anel do cursor
  let hx = 0, hy = 0, hxAlvo = 0, hyAlvo = 0;              // profundidade no hero

  addEventListener('resize', () => {
    vh = innerHeight;
    $$('.segmentado').forEach(posPilula);
    posAbas();
    marcaNav(linkAtivo);
  }, { passive: true });

  function quadro() {
    const y = scrollY;
    const dy = y - yAnt;
    yAnt = y;
    const maxY = Math.max(1, doc.scrollHeight - vh);
    const prog = limita(y / maxY, 0, 1);

    progresso.style.scale = prog + ' 1';

    // cabeçalho: sólido depois do topo, some ao descer e volta ao subir
    topo.classList.toggle('solido', y > 30);
    if (!doc.classList.contains('menu-aberto')) {
      if (y - yTopo > 14 && y > vh * 0.6) { topo.classList.add('oculto'); yTopo = y; }
      else if (yTopo - y > 14 || y < 80) { topo.classList.remove('oculto'); yTopo = y; }
      if (Math.abs(y - yTopo) > 400) yTopo = y;
    }
    // tema do cabeçalho conforme a seção que está por baixo dele
    const ponto = topo.offsetHeight * 0.6;
    for (const s of temas) {
      const r = s.getBoundingClientRect();
      if (r.top <= ponto && r.bottom > ponto) { topo.dataset.tema = s.dataset.tema; break; }
    }
    // link ativo
    let atual = null;
    secoesNav.forEach((s, i) => {
      const r = s.getBoundingClientRect();
      if (r.top < vh * 0.45 && r.bottom > vh * 0.45) atual = navLinks[i];
    });
    if (atual !== linkAtivo) {
      navLinks.forEach((a) => a.classList.toggle('ativo', a === atual));
      linkAtivo = atual;
      marcaNav(atual);
    }

    if (!reduz) {
      // parallax por rolagem
      for (const p of parallax) {
        const r = p.pai.getBoundingClientRect();
        if (r.bottom < -100 || r.top > vh + 100) continue;
        let d = -((r.top + r.height / 2) - vh / 2) * p.vel;
        if (p.el.classList.contains('foto-moldura')) d = limita(d, -r.height * 0.075, r.height * 0.075);
        p.el.style.transform = `translate3d(0, ${d.toFixed(1)}px, 0)`;
      }
      // o conteúdo do hero se dissolve ao rolar
      if (y < vh * 1.2) {
        const k = limita(y / (vh * 0.75), 0, 1);
        heroGrade.style.opacity = (1 - k * 1.1).toFixed(3);
        heroGrade.style.transform = `translate3d(0, ${(-k * 90).toFixed(1)}px, 0)`;
      }
      // cursor
      if (fino) {
        ax = lerp(ax, mx, 0.2);
        ay = lerp(ay, my, 0.2);
        anel.style.transform = `translate3d(${ax.toFixed(1)}px, ${ay.toFixed(1)}px, 0)`;
        pontoCur.style.transform = `translate3d(${mx}px, ${my}px, 0)`;
      }
      // profundidade do hero com o mouse
      hx = lerp(hx, hxAlvo, 0.06);
      hy = lerp(hy, hyAlvo, 0.06);
      if (y < vh) {
        // cada camada do hero anda numa velocidade: foto, citação e selo parecem em planos diferentes
        for (const c of camadas) c.el.style.transform = `translate3d(${(hx * c.k).toFixed(2)}px, ${(hy * c.k * 0.8).toFixed(2)}px, 0)`;
        heroFoto.style.translate = `${(-hx * 16).toFixed(2)}px ${(-hy * 10).toFixed(2)}px`;
      }
    }

    // linha do tempo preenche conforme a leitura
    if (linhaTempo) {
      const r = linhaTempo.getBoundingClientRect();
      linhaTempo.style.setProperty('--lt', limita((vh * 0.75 - r.top) / r.height, 0, 1).toFixed(3));
    }
    // voltar ao topo + barra móvel
    voltar.classList.toggle('mostra', y > vh * 0.8);
    voltar.style.setProperty('--vp', (100 - prog * 100).toFixed(2));
    const rc = contato.getBoundingClientRect();
    barraMovel.classList.toggle('mostra', y > vh * 0.7 && rc.top > vh * 0.5);

    requestAnimationFrame(quadro);
  }

  /* ---------- Cursor ---------- */
  const cursor = $('.cursor');
  const anel = $('.cursor-anel');
  const pontoCur = $('.cursor-ponto');
  const textoCur = $('.cursor-anel em');
  if (fino && !reduz) {
    let emCampo = false;
    addEventListener('pointermove', (e) => {
      mx = e.clientX; my = e.clientY;
      cursor.classList.toggle('oculto', emCampo);
    }, { passive: true });
    doc.addEventListener('mouseleave', () => cursor.classList.add('oculto'));
    addEventListener('pointerdown', () => cursor.classList.add('pressionado'));
    addEventListener('pointerup', () => cursor.classList.remove('pressionado'));
    document.addEventListener('pointerover', (e) => {
      const alvo = e.target.closest('a, button, label, input[type="range"], select, .faq-q, [data-cursor]');
      const comTexto = e.target.closest('[data-cursor]');
      cursor.classList.toggle('sobre', !!alvo && !comTexto);
      cursor.classList.toggle('com-texto', !!comTexto);
      textoCur.textContent = comTexto ? comTexto.dataset.cursor : '';
      // em campos de texto o anel some para não atrapalhar a digitação
      emCampo = !!e.target.closest('input[type="text"], input[type="email"], input[type="tel"], input[type="search"], input:not([type]), textarea');
      cursor.classList.toggle('oculto', emCampo);
    });
  }

  /* ---------- Hero: luz e profundidade seguindo o mouse ---------- */
  if (fino && !reduz) {
    heroLuz.addEventListener('pointermove', (e) => {
      const r = heroLuz.getBoundingClientRect();
      hxAlvo = (e.clientX - r.left) / r.width - 0.5;
      hyAlvo = (e.clientY - r.top) / r.height - 0.5;
      heroLuz.style.setProperty('--hx', ((e.clientX - r.left) / r.width * 100).toFixed(1) + '%');
      heroLuz.style.setProperty('--hy', ((e.clientY - r.top) / r.height * 100).toFixed(1) + '%');
    });
    heroLuz.addEventListener('pointerleave', () => { hxAlvo = 0; hyAlvo = 0; });
  }

  /* ---------- Holofote que segue o mouse + borda viva nos cartões da lei ---------- */
  if (fino && !reduz) {
    $$('.holofote').map((h) => h.parentElement).forEach((sec) => {
      sec.addEventListener('pointermove', (e) => {
        const r = sec.getBoundingClientRect();
        sec.style.setProperty('--sx', (e.clientX - r.left) + 'px');
        sec.style.setProperty('--sy', (e.clientY - r.top) + 'px');
      });
    });
    const gradeLeis = $('.grade-leis');
    const leis = $$('.lei');
    gradeLeis?.addEventListener('pointermove', (e) => {
      leis.forEach((c) => {
        const r = c.getBoundingClientRect();
        c.style.setProperty('--mx', (e.clientX - r.left) + 'px');
        c.style.setProperty('--my', (e.clientY - r.top) + 'px');
      });
    });
  }

  /* ---------- Botões: ímã, onda ao clicar ---------- */
  if (fino && !reduz) {
    $$('[data-magnetico]').forEach((el) => {
      el.addEventListener('pointermove', (e) => {
        const r = el.getBoundingClientRect();
        const dx = (e.clientX - (r.left + r.width / 2)) * 0.28;
        const dy = (e.clientY - (r.top + r.height / 2)) * 0.4;
        el.classList.add('ima');
        el.style.transform = `translate3d(${dx.toFixed(1)}px, ${dy.toFixed(1)}px, 0)`;
      });
      el.addEventListener('pointerleave', () => {
        el.classList.remove('ima');
        el.style.transform = '';
      });
    });
  }
  document.addEventListener('pointerdown', (e) => {
    const b = e.target.closest('.btn');
    if (!b || reduz) return;
    const r = b.getBoundingClientRect();
    const s = Math.max(r.width, r.height) * 2.2;
    const o = document.createElement('span');
    o.className = 'ripple';
    o.style.cssText = `width:${s}px;height:${s}px;left:${e.clientX - r.left - s / 2}px;top:${e.clientY - r.top - s / 2}px`;
    b.append(o);
    setTimeout(() => o.remove(), 800);
  });

  /* ---------- Inclinação 3D com brilho ---------- */
  if (fino && !reduz) {
    $$('[data-tilt]').forEach((el) => {
      el.addEventListener('pointermove', (e) => {
        const r = el.getBoundingClientRect();
        const px = (e.clientX - r.left) / r.width;
        const py = (e.clientY - r.top) / r.height;
        el.classList.add('tilt-ativo');
        el.style.setProperty('--ry', ((px - 0.5) * 12).toFixed(2) + 'deg');
        el.style.setProperty('--rx', ((0.5 - py) * 10).toFixed(2) + 'deg');
        el.style.setProperty('--gx', (px * 100).toFixed(1) + '%');
        el.style.setProperty('--gy', (py * 100).toFixed(1) + '%');
      });
      el.addEventListener('pointerleave', () => {
        el.classList.remove('tilt-ativo');
        el.style.setProperty('--ry', '0deg');
        el.style.setProperty('--rx', '0deg');
      });
    });
  }

  /* ---------- Passo a passo: etapa ativa conforme a rolagem ---------- */
  const passos = $$('.passo');
  const roda = $('.passos-num-roda');
  const barraPassos = $('.passos-barra');
  const basePassos = $('.passos-base span');
  let passoAtual = -1;
  function ativaPasso(i) {
    if (i === passoAtual) return;
    passoAtual = i;
    passos.forEach((p, k) => p.classList.toggle('ativo', k === i));
    roda.style.setProperty('--passo', i);
    barraPassos.style.setProperty('--pp', ((i + 1) / passos.length).toFixed(3));
    basePassos.classList.add('trocando');
    setTimeout(() => {
      basePassos.textContent = passos[i].dataset.base;
      basePassos.classList.remove('trocando');
    }, 260);
  }
  const obsPassos = new IntersectionObserver((entradas) => {
    entradas.forEach((e) => { if (e.isIntersecting) ativaPasso(passos.indexOf(e.target)); });
  }, { rootMargin: '-42% 0px -48% 0px' });
  passos.forEach((p) => obsPassos.observe(p));
  ativaPasso(0);

  /* ---------- Controles segmentados ---------- */
  function posPilula(seg) {
    const pil = $('.seg-pilula', seg);
    const marcado = $('input:checked', seg);
    if (!pil || !marcado) return;
    const lab = marcado.closest('label');
    pil.style.left = lab.offsetLeft + 'px';
    pil.style.width = lab.offsetWidth + 'px';
  }
  $$('.segmentado').forEach((seg) => {
    seg.addEventListener('change', () => posPilula(seg));
    posPilula(seg);
  });
  document.fonts?.ready.then(() => { $$('.segmentado').forEach(posPilula); posAbas(); marcaNav(linkAtivo); });

  /* ---------- Simulador ---------- */
  const simValor = $('#sim-valor');
  const simRange = $('#sim-range');
  const simHon = $('#sim-hon');
  const simHonOut = $('#sim-hon-out');
  const simPend = $('#sim-pend');
  const simForm = $('#sim-form');
  const MIN = 10000, MAX = 10000000;
  const deRange = (v) => Math.round(MIN * Math.pow(MAX / MIN, v / 1000) / 1000) * 1000;
  const paraRange = (v) => Math.round(Math.log(v / MIN) / Math.log(MAX / MIN) * 1000);
  const digitos = (s) => Number(String(s).replace(/\D/g, '')) || 0;
  const preencheRange = (r) => r.style.setProperty('--p', ((r.value - r.min) / (r.max - r.min) * 100).toFixed(2) + '%');

  // regras do modelo ilustrativo (deságio = base do ente + custo por ano de espera)
  const BASE = { uniao: 0.10, estado: 0.22, municipio: 0.26 };
  const ANO = { uniao: 0.07, estado: 0.09, municipio: 0.10 };
  const ROTULO_PRAZO = { '1.25': 'Esperar até dez/2027', '2.25': 'Esperar até dez/2028', '3.5': 'Esperar até 2029 ou mais', '5': 'Esperar sem data prevista' };

  function animaValor(el, para, fmt) {
    const de = el._v ?? 0;
    el._v = para;
    if (reduz) { el.textContent = fmt(para); return; }
    const t0 = performance.now();
    const dur = 750;
    cancelAnimationFrame(el._raf);
    const passo = (t) => {
      const p = limita((t - t0) / dur, 0, 1);
      el.textContent = fmt(lerp(de, para, suave(p)));
      if (p < 1) el._raf = requestAnimationFrame(passo);
    };
    el._raf = requestAnimationFrame(passo);
  }

  let simUltimo = null;
  function simula() {
    const face = limita(digitos(simValor.value), 0, 999999999);
    const ente = $('input[name="ente"]:checked', simForm).value;
    const natureza = $('input[name="natureza"]:checked', simForm).value;
    const prazo = $('input[name="prazo"]:checked', simForm).value;
    const anos = Number(prazo);
    const hon = Number(simHon.value) / 100;
    const pend = simPend.checked;

    let d = BASE[ente] + ANO[ente] * anos + (natureza === 'alimentar' ? -0.02 : 0) + (pend ? 0.06 : 0);
    d = limita(d, 0.12, 0.7);
    const dMin = limita(d - 0.035, 0.1, 0.68);
    const dMax = limita(d + 0.035, 0.14, 0.72);
    const disponivel = face * (1 - hon);
    const recMed = disponivel * (1 - d);

    animaValor($('#sim-min'), disponivel * (1 - dMax), brl.format);
    animaValor($('#sim-max'), disponivel * (1 - dMin), brl.format);
    animaValor($('#sim-desagio'), d * 100, (v) => Math.round(v) + '%');
    $('#leg-voce').textContent = brl.format(recMed);
    $('#leg-hon').textContent = brl.format(face * hon);
    $('#leg-desagio').textContent = brl.format(disponivel - recMed);

    const pv = face ? recMed / face * 100 : 0;
    const ph = hon * 100;
    const pd = face ? (disponivel - recMed) / face * 100 : 0;
    const seg = (sel, tam, desloc) => {
      const c = $(sel);
      c.style.strokeDasharray = `${tam.toFixed(2)} ${(100 - tam).toFixed(2)}`;
      c.style.strokeDashoffset = (-desloc).toFixed(2);
    };
    seg('.rosca-voce', pv, 0);
    seg('.rosca-hon', ph, pv);
    seg('.rosca-desagio', pd, pv + ph);

    $('#comp-agora').textContent = brl.format(recMed);
    $('#comp-futuro').textContent = brl.format(disponivel);
    $('#comp-futuro-rot').textContent = ROTULO_PRAZO[prazo];
    $('#bar-agora').style.width = (disponivel ? recMed / disponivel * 100 : 0).toFixed(1) + '%';
    $('#bar-futuro').style.width = disponivel ? '100%' : '0%';

    const fim = $('.sim-valor-final');
    fim.classList.remove('pulsa'); void fim.offsetWidth; fim.classList.add('pulsa');

    simUltimo = { face, ente, natureza, prazo, hon, pend, min: disponivel * (1 - dMax), max: disponivel * (1 - dMin) };
  }

  simValor.addEventListener('input', () => {
    const v = digitos(simValor.value);
    simValor.value = v ? milhar.format(v) : '';
    simRange.value = paraRange(limita(v, MIN, MAX));
    preencheRange(simRange);
    simula();
  });
  simRange.addEventListener('input', () => {
    simValor.value = milhar.format(deRange(Number(simRange.value)));
    preencheRange(simRange);
    simula();
  });
  simHon.addEventListener('input', () => {
    simHonOut.textContent = simHon.value + '%';
    preencheRange(simHon);
    simula();
  });
  simForm.addEventListener('change', simula);
  simRange.value = paraRange(digitos(simValor.value));
  preencheRange(simRange);
  preencheRange(simHon);
  // os números do simulador animam quando ele aparece na tela
  const caixaSim = $('.sim');
  caixaSim._aoEntrar = () => {
    if (caixaSim._ja) return;
    caixaSim._ja = true;
    ['#sim-min', '#sim-max', '#sim-desagio'].forEach((s) => { $(s)._v = 0; });
    simula();
  };
  simula();

  /* ---------- Perguntas frequentes ---------- */
  const itens = $$('.faq-item');
  const vazio = $('.faq-vazio');
  const busca = $('#faq-busca');
  const abas = $$('.abas button');
  const abasMarca = $('.abas-marca');
  let categoria = 'todas';
  const semAcento = (s) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
  const escapa = (s) => s.replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

  itens.forEach((it, i) => {
    const q = $('.faq-q', it);
    const r = $('.faq-r', it);
    const span = $('span', q);
    const id = 'faq-r-' + i;
    r.id = id;
    r.setAttribute('role', 'region');
    q.setAttribute('aria-controls', id);
    r.inert = true;
    it._pergunta = span.textContent;
    it._texto = semAcento(span.textContent + ' ' + r.textContent);
    q.addEventListener('click', () => {
      const abrir = !it.classList.contains('aberto');
      itens.forEach((o) => {
        if (o !== it && o.classList.contains('aberto')) {
          o.classList.remove('aberto');
          $('.faq-q', o).setAttribute('aria-expanded', 'false');
          $('.faq-r', o).inert = true;
        }
      });
      it.classList.toggle('aberto', abrir);
      q.setAttribute('aria-expanded', String(abrir));
      r.inert = !abrir;
    });
  });

  function posAbas() {
    const sel = $('.abas button[aria-selected="true"]');
    if (!sel || !abasMarca) return;
    abasMarca.style.left = sel.offsetLeft + 'px';
    abasMarca.style.top = sel.offsetTop + 'px';
    abasMarca.style.width = sel.offsetWidth + 'px';
    abasMarca.style.height = sel.offsetHeight + 'px';
  }

  function filtraFaq() {
    const termo = semAcento(busca.value.trim());
    let n = 0;
    itens.forEach((it) => {
      const cats = it.dataset.cat.split(' ');
      const ok = (categoria === 'todas' || cats.includes(categoria)) && (!termo || it._texto.includes(termo));
      const span = $('.faq-q span', it);
      if (termo && ok) {
        // realça o termo na pergunta, respeitando acentos do texto original
        const orig = it._pergunta;
        const base = semAcento(orig);
        const k = base.indexOf(termo);
        span.innerHTML = k >= 0
          ? escapa(orig.slice(0, k)) + '<mark>' + escapa(orig.slice(k, k + termo.length)) + '</mark>' + escapa(orig.slice(k + termo.length))
          : escapa(orig);
      } else {
        span.textContent = it._pergunta;
      }
      const estava = !it.classList.contains('some');
      it.classList.toggle('some', !ok);
      if (ok) {
        it.classList.remove('surge');
        if (!estava || !termo) { void it.offsetWidth; it.style.animationDelay = (n * 45) + 'ms'; it.classList.add('surge'); }
        n++;
      } else if (it.classList.contains('aberto')) {
        it.classList.remove('aberto');
        $('.faq-q', it).setAttribute('aria-expanded', 'false');
        $('.faq-r', it).inert = true;
      }
    });
    vazio.hidden = n > 0;
  }
  abas.forEach((b) => b.addEventListener('click', () => {
    abas.forEach((o) => o.setAttribute('aria-selected', String(o === b)));
    categoria = b.dataset.cat;
    posAbas();
    filtraFaq();
  }));
  let buscaT;
  busca.addEventListener('input', () => { clearTimeout(buscaT); buscaT = setTimeout(filtraFaq, 140); });

  /* ---------- Copiar e-mail ---------- */
  $$('[data-copiar]').forEach((b) => b.addEventListener('click', async () => {
    await copia(b.dataset.copiar);
    avisa('E-mail copiado: ' + b.dataset.copiar);
    const rotulo = $('span', b);
    b.classList.add('copiado');
    if (rotulo) rotulo.textContent = 'Copiado!';
    clearTimeout(b._t);
    b._t = setTimeout(() => { b.classList.remove('copiado'); if (rotulo) rotulo.textContent = 'Copiar'; }, 2200);
  }));

  /* ---------- Formulário de avaliação ---------- */
  const form = $('#form-avaliacao');
  const sucesso = $('#sucesso');
  const caixaForm = $('.form-caixa');
  const fTel = $('#f-tel');
  const fValor = $('#f-valor');
  const fLgpd = $('#f-lgpd');
  const btnEnviar = $('.btn-enviar');
  let mensagem = { assunto: '', corpo: '' };

  fTel.addEventListener('input', () => {
    const d = fTel.value.replace(/\D/g, '').slice(0, 11);
    let s = d;
    if (d.length > 2) s = `(${d.slice(0, 2)}) ${d.slice(2)}`;
    if (d.length > 7) s = `(${d.slice(0, 2)}) ${d.slice(2, d.length - 4)}-${d.slice(-4)}`;
    fTel.value = s;
  });
  fValor.addEventListener('input', () => {
    const v = digitos(fValor.value);
    fValor.value = v ? milhar.format(v) : '';
  });

  const regras = {
    'f-nome': (v) => v.trim().length >= 3,
    'f-email': (v) => /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v.trim()),
    'f-tel': (v) => v.replace(/\D/g, '').length >= 10,
  };
  function treme(el) {
    el.classList.remove('treme'); void el.offsetWidth; el.classList.add('treme');
    setTimeout(() => el.classList.remove('treme'), 520);
  }
  Object.keys(regras).forEach((id) => {
    const inp = $('#' + id);
    inp.addEventListener('input', () => { if (regras[id](inp.value)) inp.closest('.campo').classList.remove('erro'); });
    inp.addEventListener('blur', () => { if (inp.value && !regras[id](inp.value)) inp.closest('.campo').classList.add('erro'); });
  });
  fLgpd.addEventListener('change', () => { if (fLgpd.checked) $('.aceite-erro').classList.remove('mostra'); });

  const PERFIS = { vender: 'Quero vender um precatório', comprar: 'Quero comprar precatórios', advogado: 'Sou advogado(a)' };
  function montaMensagem(dados) {
    const perfil = PERFIS[dados.perfil];
    const linhas = [
      'Olá, equipe MF Capital!',
      '',
      'Gostaria de solicitar uma avaliação.',
      '',
      `Perfil: ${perfil}`,
      `Nome: ${dados.nome}`,
      `E-mail: ${dados.email}`,
      `Telefone/WhatsApp: ${dados.telefone}`,
      `Ente devedor: ${dados.ente || 'Não informado'}`,
      `Nº do processo/precatório: ${dados.processo || 'Não informado'}`,
      `Valor aproximado: ${dados.valor ? 'R$ ' + dados.valor : 'Não informado'}`,
    ];
    if (dados.mensagem) linhas.push('', 'Mensagem:', dados.mensagem);
    linhas.push('', '— Enviado pelo site da MF Capital');
    return { assunto: `Solicitação de avaliação — ${perfil} — ${dados.nome}`, corpo: linhas.join('\n') };
  }

  function estoura() {
    const box = $('.sucesso-burst');
    box.innerHTML = '';
    if (reduz) return;
    for (let i = 0; i < 26; i++) {
      const p = document.createElement('i');
      const ang = (i / 26) * Math.PI * 2 + Math.random() * 0.3;
      const dist = 70 + Math.random() * 110;
      p.style.setProperty('--tx', (Math.cos(ang) * dist).toFixed(1) + 'px');
      p.style.setProperty('--ty', (Math.sin(ang) * dist).toFixed(1) + 'px');
      p.style.setProperty('--r', Math.round(Math.random() * 360) + 'deg');
      p.style.animationDelay = (0.35 + Math.random() * 0.15).toFixed(2) + 's';
      if (i % 3 === 0) p.style.background = '#fff';
      box.append(p);
    }
  }

  form.addEventListener('submit', (e) => {
    e.preventDefault();
    let primeiro = null;
    Object.keys(regras).forEach((id) => {
      const inp = $('#' + id);
      const ok = regras[id](inp.value);
      const campo = inp.closest('.campo');
      campo.classList.toggle('erro', !ok);
      if (!ok) { treme(campo); primeiro = primeiro || inp; }
    });
    if (!fLgpd.checked) {
      $('.aceite-erro').classList.add('mostra');
      treme($('.aceite'));
      primeiro = primeiro || fLgpd;
    }
    if (primeiro) { primeiro.focus({ preventScroll: false }); return; }

    const dados = Object.fromEntries(new FormData(form).entries());
    mensagem = montaMensagem(dados);
    const enc = encodeURIComponent;
    $('#enviar-gmail').href = `https://mail.google.com/mail/?view=cm&fs=1&to=${EMAIL}&su=${enc(mensagem.assunto)}&body=${enc(mensagem.corpo)}`;
    $('#enviar-app').href = `mailto:${EMAIL}?subject=${enc(mensagem.assunto)}&body=${enc(mensagem.corpo)}`;

    btnEnviar.classList.add('enviando');
    btnEnviar.disabled = true;
    setTimeout(() => {
      form.classList.add('saindo');
      setTimeout(() => {
        form.setAttribute('aria-hidden', 'true');
        form.inert = true;
        sucesso.hidden = false;
        caixaForm.classList.add('compacto');
        void sucesso.offsetWidth;
        sucesso.classList.add('mostra');
        estoura();
        sucesso.focus({ preventScroll: true });
        // traz a confirmação para o centro da tela (no celular o formulário era bem mais alto)
        const rs = caixaForm.getBoundingClientRect();
        if (rs.top < 70 || rs.bottom > innerHeight) caixaForm.scrollIntoView({ block: 'center', behavior: reduz ? 'auto' : 'smooth' });
        btnEnviar.classList.remove('enviando');
        btnEnviar.disabled = false;
      }, 420);
    }, 1100);
  });

  $('#copiar-msg').addEventListener('click', async () => {
    await copia(`Para: ${EMAIL}\nAssunto: ${mensagem.assunto}\n\n${mensagem.corpo}`);
    avisa('Mensagem copiada. É só colar no seu e-mail.');
  });
  $('#nova-solicitacao').addEventListener('click', () => {
    sucesso.classList.remove('mostra');
    setTimeout(() => {
      caixaForm.classList.remove('compacto');
      sucesso.hidden = true;
      form.inert = false;
      form.removeAttribute('aria-hidden');
      form.classList.remove('saindo');
      $('#f-nome').focus({ preventScroll: true });
    }, 400);
  });
  $('#enviar-gmail').addEventListener('click', () => avisa('Abrindo o Gmail com a mensagem pronta…'));

  // botões que já escolhem o perfil (ex.: "Quero conhecer oportunidades")
  function escolhePerfil(valor) {
    const r = $(`input[name="perfil"][value="${valor}"]`, form);
    if (!r) return;
    r.checked = true;
    posPilula(r.closest('.segmentado'));
  }
  $$('[data-perfil]').forEach((a) => a.addEventListener('click', () => escolhePerfil(a.dataset.perfil)));

  // do simulador para o formulário, já com os dados preenchidos
  $('#sim-cta').addEventListener('click', () => {
    if (!simUltimo) return;
    escolhePerfil('vender');
    const nomes = { uniao: 'União (federal)', estado: 'Estado / DF', municipio: 'Município' };
    $('#f-ente').value = nomes[simUltimo.ente];
    fValor.value = milhar.format(simUltimo.face);
    const msg = $('#f-msg');
    const prazoTxt = { '1.25': 'orçamento de 2027', '2.25': 'orçamento de 2028', '3.5': '2029 ou depois', '5': 'sem previsão' }[simUltimo.prazo];
    msg.value = `Simulei no site: crédito ${simUltimo.natureza}, pagamento previsto para ${prazoTxt}, honorários contratuais de ${Math.round(simUltimo.hon * 100)}%${simUltimo.pend ? ', com pendência conhecida' : ''}. Faixa estimada: ${brl.format(simUltimo.min)} a ${brl.format(simUltimo.max)}.`;
    avisa('Levamos os dados da simulação para o formulário.');
  });

  requestAnimationFrame(quadro);
})();
