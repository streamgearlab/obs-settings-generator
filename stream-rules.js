/*
 * Platform encoder guidance (Twitch, YouTube, Kick).
 * Every number comes from an official platform page (checked November 1, 2026).
 *   Twitch:  https://help.twitch.tv/s/article/broadcasting-guidelines
 *            https://help.twitch.tv/s/article/how-do-i-stream-faq   (upload = bitrate + 30%)
 *   YouTube: https://support.google.com/youtube/answer/2853702     (H.264 / AV1 / HEVC table)
 *   Kick:    https://help.kick.com/en/articles/7066931-how-to-stream-on-kick-com   (max 8,000 kbps, 1080p60, H.264, CBR)
 *            https://help.kick.com/en/articles/15159752-settings-and-stream-quality-on-the-kick-go-live-app
 *            https://help.kick.com/en/articles/14994379-why-is-my-stream-lagging-or-buffering-on-kick (upload >= 2x bitrate)
 *
 * Part of StreamGearLab's free tools (https://streamgearlab.com). MIT License.
 */
var CHECKED = 'November 1, 2026';

var PLATFORMS = {
  twitch: {
    id: 'twitch',
    name: 'Twitch',
    headroomFactor: 1.3,
    headroomNote: 'Twitch: upload speed should equal your stream bitrate + 30%.',
    maxKbps: null,
    audioKbps: 96,
    audioNote: 'AAC, 96 kbps recommended by Twitch (160 kbps maximum).',
    sampleRate: '48 kHz (OBS default)',
    keyframe: '2 seconds',
    rateControl: 'CBR',
    tiers: [
      { id: '1080p60', label: '1080p 60 fps', w: 1920, h: 1080, fps: 60, minKbps: 6000, recKbps: 6000 },
      { id: '1080p30', label: '1080p 30 fps', w: 1920, h: 1080, fps: 30, minKbps: 4500, recKbps: 4500 },
      { id: '720p60', label: '720p 60 fps', w: 1280, h: 720, fps: 60, minKbps: 4500, recKbps: 4500 },
      { id: '720p30', label: '720p 30 fps', w: 1280, h: 720, fps: 30, minKbps: 3000, recKbps: 3000 },
    ],
    fallback: { id: '480p30', label: '480p 30 fps', w: 852, h: 480, fps: 30, minKbps: 1000, recKbps: 2500, note: 'Below Twitch\'s lowest table row; our suggestion, not an official Twitch figure.' },
    sources: [
      { label: 'Twitch – Broadcasting Guidelines', url: 'https://help.twitch.tv/s/article/broadcasting-guidelines' },
      { label: 'Twitch – How Do I Stream FAQ (upload speed + 30%)', url: 'https://help.twitch.tv/s/article/how-do-i-stream-faq' },
    ],
  },
  youtube: {
    id: 'youtube',
    name: 'YouTube',
    // YouTube does not publish a headroom figure; we apply the same +30% rule as Twitch.
    headroomFactor: 1.3,
    headroomNote: 'YouTube publishes no headroom figure, so we apply the same +30% rule Twitch uses.',
    maxKbps: null,
    audioKbps: 128,
    audioNote: 'AAC, 128 kbps for stereo (YouTube recommendation).',
    sampleRate: '44.1 kHz for stereo (YouTube recommendation; 48 kHz for 5.1)',
    keyframe: '2 seconds (YouTube: do not exceed 4 seconds)',
    rateControl: 'CBR',
    tiers: [
      { id: '1440p60', label: '1440p 60 fps', w: 2560, h: 1440, fps: 60, minKbps: 8000, recKbps: 34000 },
      { id: '1440p30', label: '1440p 30 fps', w: 2560, h: 1440, fps: 30, minKbps: 7000, recKbps: 21000 },
      { id: '1080p60', label: '1080p 60 fps', w: 1920, h: 1080, fps: 60, minKbps: 6000, recKbps: 17000 },
      { id: '1080p30', label: '1080p 30 fps', w: 1920, h: 1080, fps: 30, minKbps: 5000, recKbps: 14000 },
      { id: '720p60', label: '720p 60 fps', w: 1280, h: 720, fps: 60, minKbps: 3000, recKbps: 8000 },
      { id: '720p30', label: '720p 30 fps', w: 1280, h: 720, fps: 30, minKbps: 3000, recKbps: 8000 },
      { id: '480p30', label: '480p 30 fps', w: 854, h: 480, fps: 30, minKbps: 400, recKbps: 4000 },
    ],
    fallback: null,
    sources: [{ label: 'YouTube Help – Choose live encoder settings, bitrates, and resolutions', url: 'https://support.google.com/youtube/answer/2853702' }],
  },
  kick: {
    id: 'kick',
    name: 'Kick',
    headroomFactor: 2,
    headroomNote: 'Kick: upload speed should be at least twice your stream bitrate.',
    maxKbps: 8000,
    audioKbps: 160,
    audioNote: 'AAC stereo, max 48 kHz. Kick doesn\'t publish an audio bitrate, so we suggest 128–160 kbps (OBS default is 160).',
    sampleRate: '48 kHz maximum (Kick)',
    keyframe: '2 seconds',
    rateControl: 'CBR (Kick does not support VBR)',
    tiers: [
      { id: '1080p60', label: '1080p 60 fps', w: 1920, h: 1080, fps: 60, minKbps: 6000, recKbps: 8000 },
      { id: '1080p30', label: '1080p 30 fps', w: 1920, h: 1080, fps: 30, minKbps: 4500, recKbps: 6000 },
      { id: '720p60', label: '720p 60 fps', w: 1280, h: 720, fps: 60, minKbps: 3500, recKbps: 5000 },
      { id: '720p30', label: '720p 30 fps', w: 1280, h: 720, fps: 30, minKbps: 2500, recKbps: 4500 },
      { id: '480p30', label: '480p 30 fps', w: 854, h: 480, fps: 30, minKbps: 1500, recKbps: 2500 },
    ],
    fallback: null,
    sources: [
      { label: 'Kick Help – How to stream on KICK.com', url: 'https://help.kick.com/en/articles/7066931-how-to-stream-on-kick-com' },
      { label: 'Kick Help – Settings and stream quality (bitrate ranges)', url: 'https://help.kick.com/en/articles/15159752-settings-and-stream-quality-on-the-kick-go-live-app' },
      { label: 'Kick Help – Why is my stream lagging or buffering?', url: 'https://help.kick.com/en/articles/14994379-why-is-my-stream-lagging-or-buffering-on-kick' },
    ],
  },
};

/** YouTube AV1 / HEVC table (kbps), used when the user says OBS offers an AV1 or HEVC encoder. */
var YOUTUBE_AV1_HEVC = {
  '1440p60': { minKbps: 6000, recKbps: 24000 },
  '1440p30': { minKbps: 5000, recKbps: 15000 },
  '1080p60': { minKbps: 4000, recKbps: 12000 },
  '1080p30': { minKbps: 4000, recKbps: 10000 },
  '720p60': { minKbps: 2000, recKbps: 6000 },
  '720p30': { minKbps: 2000, recKbps: 6000 },
  '480p30': { minKbps: 300, recKbps: 3000 },
};

/** Max safe *video* bitrate (kbps) for a given measured upload. */
function safeVideoKbps(p, uploadMbps, otherMbps, audioKbps) {
  if (otherMbps === undefined) otherMbps = 0;
  if (audioKbps === undefined) audioKbps = p.audioKbps;
  var usable = Math.max(0, uploadMbps - otherMbps) * 1000;
  var v = Math.floor(usable / p.headroomFactor - audioKbps);
  if (p.maxKbps) v = Math.min(v, p.maxKbps);
  return Math.max(0, v);
}

function tiersFor(p, useAv1Hevc) {
  if (p.id !== 'youtube' || !useAv1Hevc) return p.tiers;
  return p.tiers.map(function (t) { return Object.assign({}, t, YOUTUBE_AV1_HEVC[t.id]); });
}

function roundDown(k) { return Math.floor(k / 100) * 100; }

function fitTier(p, t, safeKbps) {
  if (p.id === 'twitch') {
    // Twitch publishes a single figure per row; use it when it fits.
    return safeKbps >= t.recKbps ? { tier: t, status: 'full', kbps: t.recKbps } : { tier: t, status: 'no', kbps: 0 };
  }
  if (safeKbps >= t.recKbps) return { tier: t, status: 'full', kbps: t.recKbps };
  if (safeKbps >= t.minKbps) return { tier: t, status: 'reduced', kbps: roundDown(safeKbps) };
  return { tier: t, status: 'no', kbps: 0 };
}

function fmtKbps(k) { return Math.round(k).toLocaleString('en-US') + ' kbps'; }
