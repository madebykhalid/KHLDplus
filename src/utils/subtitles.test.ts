import assert from 'node:assert/strict';
import test from 'node:test';
import {
  findActiveCues,
  getActiveCueSignature,
  parseCueTokens,
  parseSubtitles,
  parseTimestamp,
} from './subtitles';

test('parseTimestamp parses HH:MM:SS.mmm and MM:SS,mmm accurately', () => {
  assert.equal(parseTimestamp('00:01:05.500'), 65.5);
  assert.equal(parseTimestamp('01:02:03,250'), 3723.25);
  assert.equal(parseTimestamp('02:10.000'), 130);
  assert.equal(Number.isNaN(parseTimestamp('invalid')), true);
});

test('parseCueTokens preserves <i> and <b> while stripping unsafe tags', () => {
  const tokens = parseCueTokens(
    '<b>Narrator:</b> Hello <i>world</i> <script>alert(1)</script> &amp; friends'
  );
  assert.deepEqual(tokens, [
    {
      type: 'b',
      children: [{ type: 'text', text: 'Narrator:' }],
    },
    {
      type: 'text',
      text: ' Hello ',
    },
    {
      type: 'i',
      children: [{ type: 'text', text: 'world' }],
    },
    {
      type: 'text',
      text: ' alert(1) & friends',
    },
  ]);
});

test('parseSubtitles strips UTF-8 BOM, normalizes CRLF, and parses both WebVTT and SRT formats', () => {
  const vttWithBomAndCrlf =
    '\uFEFFWEBVTT\r\n\r\n2\r\n00:00:10.000 --> 00:00:15.000 line:90%\r\nSecond cue\r\n\r\n1\r\n00:00:02.000 --> 00:00:06.000\r\n<b>First</b> cue';

  const cues = parseSubtitles(vttWithBomAndCrlf);
  assert.equal(cues.length, 2);
  assert.equal(cues[0].start, 2);
  assert.equal(cues[0].end, 6);
  assert.equal(cues[1].start, 10);

  const srtWithBomAndCrlf =
    '\uFEFF1\r\n00:00:01,000 --> 00:00:04,500\r\nSRT line one\r\n<i>SRT line two</i>';

  const srtCues = parseSubtitles(srtWithBomAndCrlf);
  assert.equal(srtCues.length, 1);
  assert.equal(srtCues[0].start, 1);
  assert.equal(srtCues[0].end, 4.5);
});

test('findActiveCues binary-searches active cues accurately', () => {
  const sampleVtt = `WEBVTT

1
00:00:02.000 --> 00:00:05.000
Cue A

2
00:00:06.000 --> 00:00:10.000
Cue B

3
00:00:08.000 --> 00:00:12.000
Cue C`;

  const cues = parseSubtitles(sampleVtt);
  assert.equal(findActiveCues(cues, 1.0).length, 0);

  const at3 = findActiveCues(cues, 3.5);
  assert.equal(at3.length, 1);
  assert.equal(at3[0].rawText, 'Cue A');

  const at9 = findActiveCues(cues, 9.0);
  assert.equal(at9.length, 2);
  assert.equal(getActiveCueSignature(at9), '2:6-10|3:8-12');
});
