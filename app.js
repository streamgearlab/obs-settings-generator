/*
 * OBS Settings Generator - standalone version of
 * https://streamgearlab.com/tools/obs-settings-generator/
 * Part of StreamGearLab's free tools (https://streamgearlab.com). MIT License.
 * Requires stream-rules.js to be loaded first.
 */
(function () {
  'use strict';
  var form = document.getElementById('obs-form');
  var out = document.getElementById('obs-results');
  var copyBtn = document.getElementById('copy');
  var copyStatus = document.getElementById('copy-status');
  var av1Wrap = document.getElementById('av1-wrap');
  var lastText = '';

  var ENC = {
    nvenc: { name: 'NVIDIA NVENC H.264', hw: true },
    amf: { name: 'AMD HW H.264 (AVC)', hw: true },
    qsv: { name: 'QuickSync H.264', hw: true },
    applevt: { name: 'Apple VT H264 Hardware Encoder', hw: true },
    x264: { name: 'x264 (software)', hw: false },
  };
  var esc = function (s) { return String(s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); };

  function readForm() {
    var fd = new FormData(form);
    return {
      p: fd.get('p') || 'twitch',
      up: parseFloat(String(fd.get('up') || '0')),
      enc: String(fd.get('enc') || 'nvenc'),
      cpu: String(fd.get('cpu') || 'mid'),
      canvas: parseInt(String(fd.get('canvas') || '1080'), 10),
      target: String(fd.get('target') || 'auto'),
      content: String(fd.get('content') || 'games'),
      av1: fd.get('av1') === 'on',
    };
  }

  function compute() {
    var v = readForm();
    av1Wrap.hidden = v.p !== 'youtube';
    if (!isFinite(v.up) || v.up <= 0) {
      out.innerHTML = '<div class="result-summary"><p class="warn">Enter your measured upload speed in Mbps (for example 10).</p></div>';
      copyBtn.hidden = true;
      return;
    }
    var P = PLATFORMS[v.p];
    var useAv1 = v.p === 'youtube' && v.av1 && v.enc !== 'x264';
    var encKey = v.enc;
    var notes = [];
    // Kick on a Mac: Kick tells Mac users to use x264 to get CBR.
    var kickMac = v.p === 'kick' && v.enc === 'applevt';
    if (kickMac) notes.push('Kick asks for CBR and its guide tells Mac users to switch to x264 to get it. If your OBS shows CBR under Rate Control for Apple VT you can keep Apple VT; otherwise use x264 (preset veryfast, tune zerolatency).');
    if (v.enc === 'x264' && v.cpu === 'low') notes.push('CPU-only encoding on an entry-level CPU is the most common cause of "encoding overloaded". If your computer has any hardware encoder listed in OBS, use it instead.');

    var audio = P.audioKbps;
    var safe = safeVideoKbps(P, v.up, 0, audio);
    var totalSafe = Math.floor((v.up * 1000) / P.headroomFactor);

    // Hardware cap (pixels per second). x264 depends on CPU.
    var pr = function (t) { return t.w * t.h * t.fps; };
    var capPr = encKey !== 'x264' ? Infinity : v.cpu === 'low' ? pr({ w: 1280, h: 720, fps: 30 }) : v.cpu === 'mid' ? pr({ w: 1920, h: 1080, fps: 30 }) : Infinity;

    var tiers = tiersFor(P, useAv1).filter(function (t) { return pr(t) <= capPr && t.h <= v.canvas; });
    var wants1440 = v.target === '1440p60';
    if (!(wants1440 && v.p === 'youtube')) tiers = tiers.filter(function (t) { return t.h <= 1080; });
    if (wants1440 && v.p !== 'youtube') notes.push(v.p === 'twitch' ? '1440p on Twitch goes through Enhanced Broadcasting, which sets the bitrate for you, so this tool plans for 1080p instead.' : 'Kick supports up to 1080p at 60 fps, so this tool plans for 1080p instead.');
    if (wants1440 && v.p === 'youtube' && v.canvas < 1440) notes.push('Your canvas is 1080p, so streaming 1440p would only upscale it. Planning for 1080p.');
    if (v.target !== 'auto') {
      var m = v.target.match(/(\d+)p(\d+)/);
      var th = Math.min(parseInt(m[1], 10), wants1440 && v.p !== 'youtube' ? 1080 : 9999);
      var tf = parseInt(m[2], 10);
      tiers = tiers.filter(function (t) { return t.h <= th && t.fps <= tf; });
    }
    var fpsFirst = v.content === 'fast' || v.content === 'games';
    tiers.sort(function (a, b) { return fpsFirst ? b.fps - a.fps || b.h - a.h : b.h - a.h || a.fps - b.fps; });
    if (v.target !== 'auto') tiers.sort(function (a, b) { return (b.id === v.target ? 1 : 0) - (a.id === v.target ? 1 : 0); });
    var chosen = tiers.map(function (t) { return fitTier(P, t, safe); }).find(function (f) { return f.status !== 'no'; });
    var belowTable = false;
    if (!chosen) {
      var fb = P.fallback || P.tiers[P.tiers.length - 1];
      chosen = { tier: fb, status: 'reduced', kbps: Math.max(0, Math.floor(Math.min(safe, fb.recKbps) / 100) * 100) };
      belowTable = true;
    }
    if (v.target !== 'auto' && chosen.tier.id !== v.target && !(wants1440 && v.p !== 'youtube')) {
      notes.unshift('Your target (' + v.target + ") doesn't fit your " + (encKey === 'x264' ? 'CPU or ' : '') + 'connection, so this plan steps down to ' + chosen.tier.label + '.');
    }

    var outW = chosen.tier.w, outH = chosen.tier.h;
    var resWhy = 'Highest tier your connection and encoder can carry on ' + P.name + '.';
    if (v.p === 'twitch' && v.content === 'fast' && chosen.tier.id === '1080p60') {
      outW = 1600; outH = 900;
      resWhy = "For fast-paced games, Twitch's own guidelines show 1600×900 at 60 fps and 6,000 kbps: fewer pixels per frame means less blocking in motion.";
    }
    if (chosen.status === 'reduced' && v.p !== 'twitch') resWhy += ' Your bitrate is above ' + P.name + "'s minimum for this tier but below its recommended " + fmtKbps(chosen.tier.recKbps) + '.';
    if (belowTable) resWhy = 'Your safe bitrate is below ' + P.name + "'s lowest published tier, so this is a low-resolution fallback. " + (chosen.tier.note || '');

    var scaled = outH < v.canvas;
    var filter = !scaled ? 'None (no scaling)' : encKey === 'x264' && v.cpu === 'low' ? 'Bicubic' : 'Lanczos';

    // Encoder-specific preset text
    var preset = '', presetWhy = '';
    switch (encKey) {
      case 'nvenc':
        if (v.p === 'kick') { preset = 'P6: Slower (Better Quality) · Tuning: Ultra Low Latency · Multipass: Single Pass'; presetWhy = "These are the NVENC values in Kick's own guide. If it lags, Kick suggests P3: Fast."; }
        else { preset = 'P5: Slow (Good Quality) · Tuning: High Quality · B-frames: 2'; presetWhy = "Twitch asks for NVENC's quality preset with 2 B-frames" + (v.p === 'youtube' ? ', and YouTube also recommends 2 B-frames' : '') + '. Drop to P4 if OBS reports encoding lag.'; }
        break;
      case 'amf':
        preset = 'Preset: Quality · Profile: High'; presetWhy = "OBS's AMD encoder offers Quality, Balanced and Speed presets. Start at Quality and switch to Balanced if OBS reports encoding lag.";
        break;
      case 'qsv':
        preset = 'Target Usage: TU4 (Balanced) · Profile: High'; presetWhy = 'A middle setting that leaves headroom for the game. Try a slower (lower-numbered) target usage if your GPU has room to spare.';
        break;
      case 'applevt':
        preset = 'Rate Control: CBR · Profile: High'; presetWhy = "Apple's hardware encoder has no speed preset. What matters is CBR rate control (see the note on Kick if you stream there).";
        break;
      default: {
        var p = v.cpu === 'high' ? 'faster' : v.cpu === 'mid' ? 'veryfast' : 'superfast';
        preset = 'CPU Usage Preset: ' + p + ' · Profile: High' + (v.p === 'kick' ? ' · Tune: zerolatency' : '');
        presetWhy = v.p === 'kick' ? 'Kick recommends veryfast with zerolatency, and superfast if the stream lags.' : "Twitch's guidelines give veryfast to medium as the x264 range. Slower presets look better but use far more CPU" + (v.cpu === 'low' ? ', and on an entry CPU even veryfast can overload' : '') + '.';
      }
    }

    var codecLine = useAv1 ? (encKey === 'nvenc' ? 'NVIDIA NVENC AV1' : encKey === 'amf' ? 'AMD HW AV1' : encKey === 'qsv' ? 'QuickSync AV1' : 'AV1/HEVC hardware') + ' (or the HEVC version)' : ENC[encKey].name;
    var service = v.p === 'twitch' ? 'Twitch' : v.p === 'youtube' ? 'YouTube - RTMPS' : 'Kick if listed, otherwise Custom (Stream URL + Stream Key from your Kick dashboard)';
    var audioVal = v.p === 'twitch' ? '96 kbps AAC (160 max)' : v.p === 'youtube' ? '128 kbps AAC, stereo' : '160 kbps AAC, stereo';

    var bitrateWhy = belowTable
      ? 'Below the published tables; expect a soft picture.'
      : v.p === 'twitch'
        ? "Twitch's figure for " + chosen.tier.label + (outH === 900 ? ' (used here at 900p)' : '') + '. Your connection could carry about ' + fmtKbps(safe) + " of video, but going above Twitch's figure won't improve the picture."
        : chosen.kbps >= chosen.tier.recKbps
          ? P.name + "'s " + (P.id === 'kick' ? 'top of range' : 'recommended bitrate') + ' for ' + chosen.tier.label + '. Your connection could safely carry up to ' + fmtKbps(safe) + ' of video.'
          : 'Limited by your connection: upload ÷ ' + P.headroomFactor + ' minus ' + audio + ' kbps for audio = ' + fmtKbps(safe) + (P.maxKbps ? ' (' + P.name + ' maximum ' + fmtKbps(P.maxKbps) + ')' : '') + '.';

    var rows = [
      ['Service', service, 'Settings → Stream. Signing in with your account, or pasting your stream key, connects OBS to the right ingest server.'],
      ['Encoder', codecLine, encKey === 'x264' ? 'No hardware encoder available, so OBS encodes on your CPU.' : useAv1 ? 'YouTube accepts AV1 and HEVC and recommends lower bitrates for them than for H.264.' : 'Hardware encoding runs on a dedicated chip, so your CPU stays free for the game and OBS.'],
      ['Rate control', 'CBR', P.rateControl === 'CBR' ? P.name + ' asks for constant bitrate.' : P.rateControl],
      ['Bitrate', chosen.kbps > 0 ? fmtKbps(chosen.kbps) : 'Too low to stream', bitrateWhy],
      ['Output (scaled) resolution', outW + '×' + outH, resWhy],
      ['Base (canvas) resolution', v.canvas === 1080 ? '1920×1080' : v.canvas === 1440 ? '2560×1440' : '3840×2160', 'Settings → Video. Keep this at your monitor resolution.'],
      ['Downscale filter', filter, scaled ? (filter === 'Lanczos' ? 'The sharpest filter OBS offers; its cost is small next to the encoder.' : 'Lighter on a weak CPU than Lanczos, with a slightly softer image.') : 'Output matches the canvas, so nothing is scaled.'],
      ['FPS (Common FPS Values)', String(chosen.tier.fps), chosen.tier.fps === 60 ? 'Smooth motion, which matters for games.' : 'Halves the encoding work, and the difference is hard to see on slow-moving content.'],
      ['Keyframe interval', '2 s', P.keyframe === '2 seconds' ? P.name + " asks for 2 seconds. Type 2; don't leave it at 0 (auto)." : P.keyframe + ". Type 2; don't leave it at 0 (auto)."],
      ['Encoder preset / tuning', preset, presetWhy],
      ['Audio', audioVal, P.audioNote],
      ['Sample rate', v.p === 'youtube' ? '44.1 kHz' : '48 kHz', P.sampleRate + '. Set it under Settings → Audio.'],
    ];

    var summary = P.name + ': ' + (chosen.tier.fps === 60 ? outH + 'p60' : outH + 'p30') + ' at ' + chosen.kbps.toLocaleString('en-US') + ' kbps with ' + codecLine;
    var html = '<div class="result-summary"><p class="small muted">Your plan</p><p class="big-number">' + esc(summary.split(' with ')[0]) + '</p><p>Using <strong>' + esc(codecLine) + '</strong>. Upload ' + v.up + ' Mbps → about <strong>' + fmtKbps(totalSafe) + '</strong> safe in total on ' + P.name + ' (' + esc(P.headroomNote) + ')</p>';
    if (safe < 2500) html += '<p class="warn"><strong>Heads-up:</strong> your connection is tight. Close other uploads (cloud backup, video calls, game updates), plug in with Ethernet if you can, and run the speed test again.</p>';
    if (notes.length) html += '<ul class="plan-list">' + notes.map(function (n) { return '<li>' + esc(n) + '</li>'; }).join('') + '</ul>';
    html += '</div><dl class="settings-list">' + rows.map(function (r) { return '<div class="setting"><dt>' + esc(r[0]) + '</dt><dd><span class="val">' + esc(r[1]) + '</span></dd><dd class="why">' + esc(r[2]) + '</dd></div>'; }).join('') + '</dl>';
    html += '<p class="small muted" style="margin-top:12px">OBS → Settings → Output → set Output Mode to <em>Advanced</em> to see every field above. Always do a short test stream and check View → Stats for dropped or skipped frames.</p>';
    out.innerHTML = html;
    lastText = 'StreamGearLab OBS settings — ' + summary + '\n' + rows.map(function (r) { return r[0] + ': ' + r[1]; }).join('\n');
    copyBtn.hidden = false;
  }

  // Prefill from the URL, e.g. ?p=twitch&up=10&enc=nvenc&cpu=mid&canvas=1440&target=auto&content=fast
  var qs = new URLSearchParams(location.search);
  qs.forEach(function (val, k) {
    var el = form.elements.namedItem(k);
    if (!el) return;
    if (typeof RadioNodeList !== 'undefined' && el instanceof RadioNodeList) el.value = val;
    else if (el.type === 'checkbox') el.checked = val === '1' || val === 'true';
    else el.value = val;
  });
  form.addEventListener('submit', function (e) { e.preventDefault(); compute(); out.scrollIntoView({ behavior: 'smooth', block: 'start' }); });
  form.addEventListener('change', compute);
  form.addEventListener('input', function (e) { if (e.target.id === 'up') compute(); });
  copyBtn.addEventListener('click', function () {
    function fallback() {
      try {
        var ta = document.createElement('textarea');
        ta.value = lastText; document.body.appendChild(ta); ta.select();
        var ok = document.execCommand('copy'); document.body.removeChild(ta);
        copyStatus.textContent = ok ? 'Copied.' : 'Copy failed. Select the text manually.';
      } catch (err) { copyStatus.textContent = 'Copy failed. Select the text manually.'; }
    }
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(lastText).then(function () { copyStatus.textContent = 'Copied.'; }, fallback);
    } else fallback();
  });
  compute();
})();
