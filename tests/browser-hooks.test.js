import test, { after, afterEach, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { createElement, useLayoutEffect } from 'react';
import { JSDOM } from 'jsdom';

// This test file runs in its own Node test process. All browser permissions and
// coordinates below are synthetic; no operating-system location is requested.
const dom = new JSDOM('<!doctype html><html><body></body></html>', {
  url: 'https://nebo.test/',
  pretendToBeVisual: true,
});
globalThis.window = dom.window;
globalThis.document = dom.window.document;
Object.defineProperty(globalThis, 'navigator', { value: dom.window.navigator, configurable: true });
globalThis.HTMLElement = dom.window.HTMLElement;
globalThis.Node = dom.window.Node;
globalThis.IS_REACT_ACT_ENVIRONMENT = true;

const { act, cleanup, fireEvent, render, renderHook } = await import('@testing-library/react');
const { useReducedMotion } = await import('../src/hooks/useReducedMotion.js');
const { useGeolocation } = await import('../src/hooks/useGeolocation.js');
const { useAtmosphereInteraction } = await import('../src/hooks/useAtmosphereInteraction.js');

function mediaPreference(initial = false) {
  const listeners = new Set();
  return {
    matches: initial,
    media: '(prefers-reduced-motion: reduce)',
    listeners,
    addEventListener(type, listener) { if (type === 'change') listeners.add(listener); },
    removeEventListener(type, listener) { if (type === 'change') listeners.delete(listener); },
    change(matches) {
      this.matches = matches;
      listeners.forEach((listener) => listener({ matches, media: this.media }));
    },
  };
}

let media;
let frameId = 0;
const frames = new Map();
globalThis.requestAnimationFrame = (callback) => { frames.set(++frameId, callback); return frameId; };
globalThis.cancelAnimationFrame = (id) => frames.delete(id);

function setGeolocation(value) {
  Object.defineProperty(navigator, 'geolocation', { value, configurable: true });
}

function locationProvider() {
  const calls = [];
  setGeolocation({ getCurrentPosition(success, failure, options) { calls.push({ success, failure, options }); } });
  return calls;
}

beforeEach(() => {
  media = mediaPreference();
  window.matchMedia = (query) => {
    assert.equal(query, '(prefers-reduced-motion: reduce)');
    return media;
  };
  setGeolocation(undefined);
});
afterEach(() => { cleanup(); frames.clear(); });
after(() => dom.window.close());

test('reduced motion uses the initial device preference and removes its listener', () => {
  media.matches = true;
  const view = renderHook(() => useReducedMotion());
  assert.equal(view.result.current, true);
  assert.equal(media.listeners.size, 1);
  view.unmount();
  assert.equal(media.listeners.size, 0);
});

test('reduced motion responds to preference changes without remounting', () => {
  const { result } = renderHook(() => useReducedMotion());
  assert.equal(result.current, false);
  act(() => media.change(true));
  assert.equal(result.current, true);
  act(() => media.change(false));
  assert.equal(result.current, false);
});

test('geolocation accepts a synthetic success and bounds the permission request', () => {
  const calls = locationProvider();
  const received = [];
  const { result } = renderHook(() => useGeolocation());
  act(() => result.current.locate((coordinates) => received.push(coordinates)));
  assert.equal(result.current.locating, true);
  assert.deepEqual(calls[0].options, { enableHighAccuracy: false, timeout: 10000, maximumAge: 300000 });
  act(() => calls[0].success({ coords: { latitude: 0, longitude: 0 } }));
  assert.deepEqual(received, ['0,0']);
  assert.equal(result.current.locating, false);
  assert.equal(result.current.error, null);
});

test('unsupported geolocation offers city search without calling a location service', () => {
  const { result } = renderHook(() => useGeolocation());
  let received = false;
  act(() => result.current.locate(() => { received = true; }));
  assert.equal(received, false);
  assert.equal(result.current.locating, false);
  assert.equal(result.current.error.code, 'location');
  assert.match(result.current.error.message, /геолокация недоступна/);
  assert.match(result.current.error.message, /поиск/);
});

test('invalid geolocation coordinates offer retry and never become a weather query', () => {
  const calls = locationProvider();
  const received = [];
  const { result } = renderHook(() => useGeolocation());
  const onSuccess = coordinates => received.push(coordinates);
  const invalidPositions = [{}, { coords: { latitude: NaN, longitude: 0 } },
    { coords: { latitude: -91, longitude: 0 } }, { coords: { latitude: 0, longitude: 181 } }];

  for (const position of invalidPositions) {
    act(() => result.current.locate(onSuccess));
    act(() => calls.at(-1).success(position));
    assert.equal(result.current.locating, false);
    assert.equal(result.current.error.code, 'location');
  }
  assert.deepEqual(received, []);

  act(() => result.current.locate(onSuccess));
  act(() => calls.at(-1).success({ coords: { latitude: -90, longitude: 180 } }));
  assert.deepEqual(received, ['-90,180']);
  assert.equal(result.current.error, null);
});

test('permission refusal becomes actionable Russian copy and can be cleared', () => {
  const calls = locationProvider();
  const { result } = renderHook(() => useGeolocation());
  act(() => result.current.locate(() => assert.fail('A denied request must not succeed')));
  act(() => calls[0].failure({ code: 1, message: 'PRIVATE DEVICE DETAIL' }));
  assert.equal(result.current.locating, false);
  assert.match(result.current.error.message, /Нет доступа/);
  assert.match(result.current.error.message, /поиск/);
  assert.ok(!result.current.error.message.includes('PRIVATE'));
  act(() => result.current.cancel());
  assert.equal(result.current.error, null);
});

test('a location timeout stops the pending state and offers retry or search', () => {
  const calls = locationProvider();
  const { result } = renderHook(() => useGeolocation());
  act(() => result.current.locate(() => assert.fail('A timed-out request must not succeed')));
  act(() => calls[0].failure({ code: 3 }));
  assert.equal(result.current.locating, false);
  assert.match(result.current.error.message, /Не удалось определить местоположение/);
  assert.match(result.current.error.message, /Попробуйте ещё раз/);
});

test('a geolocation call blocked during setup can recover and be retried', () => {
  setGeolocation({
    getCurrentPosition() { throw new DOMException('PRIVATE DEVICE DETAIL', 'SecurityError'); },
  });
  const { result } = renderHook(() => useGeolocation());
  const received = [];
  const loadWeather = (coordinates) => received.push(coordinates);

  act(() => result.current.locate(loadWeather));
  assert.equal(result.current.locating, false);
  assert.equal(result.current.error.code, 'location');
  assert.match(result.current.error.message, /Нет доступа/);
  assert.ok(!result.current.error.message.includes('PRIVATE'));
  assert.deepEqual(received, []);

  const calls = locationProvider();
  act(() => result.current.locate(loadWeather));
  act(() => calls[0].success({ coords: { latitude: 0, longitude: 0 } }));
  assert.deepEqual(received, ['0,0']);
  assert.equal(result.current.error, null);
});

test('cancelled location callbacks cannot replace a newer city or create an error', () => {
  const calls = locationProvider();
  const received = [];
  const { result } = renderHook(() => useGeolocation());
  act(() => result.current.locate((coordinates) => received.push(coordinates)));
  act(() => result.current.cancel());
  act(() => {
    calls[0].success({ coords: { latitude: 0, longitude: 0 } });
    calls[0].failure({ code: 1 });
  });
  assert.deepEqual(received, []);
  assert.equal(result.current.locating, false);
  assert.equal(result.current.error, null);
  act(() => result.current.locate((coordinates) => received.push(coordinates)));
  act(() => calls[1].success({ coords: { latitude: 1, longitude: 1 } }));
  assert.deepEqual(received, ['1,1']);
});

test('unmount invalidates an outstanding synthetic location request', () => {
  const calls = locationProvider();
  const received = [];
  const { result, unmount } = renderHook(() => useGeolocation());
  act(() => result.current.locate((coordinates) => received.push(coordinates)));
  unmount();
  calls[0].success({ coords: { latitude: 0, longitude: 0 } });
  assert.deepEqual(received, []);
});

function mountAtmosphere(motion = true) {
  let state;
  function Fixture({ moving }) {
    const interaction = useAtmosphereInteraction(moving);
    useLayoutEffect(() => { state = interaction; });
    return createElement('section', { ref: interaction.surfaceRef, 'data-testid': 'scene-surface' },
      createElement('div', { ref: interaction.backgroundRef }),
      moving && createElement('svg', { 'aria-hidden': true },
        createElement('path', { ref: interaction.windRef, d: '', opacity: 0, 'data-testid': 'scene-wind' })),
      createElement('button', {
        className: 'scene-touch', onClick: interaction.react,
        onPointerDown: interaction.pointerDown, onPointerMove: interaction.pointerMove,
        onPointerUp: interaction.pointerUp, onPointerCancel: interaction.pointerCancel,
        'aria-label': 'Оживить фон',
      }),
      createElement('button', { 'aria-label': 'Выбрать город' }, 'Город'));
  }
  const view = render(createElement(Fixture, { moving: motion }));
  const surface = view.getByTestId('scene-surface');
  const button = view.getByRole('button', { name: 'Оживить фон' });
  const rect = { left: 80, top: 120, width: 400, height: 240, right: 480, bottom: 360 };
  surface.getBoundingClientRect = () => rect;
  button.getBoundingClientRect = () => rect;
  return {
    view, surface, button,
    get state() { return state; },
    get wind() { return view.queryByTestId('scene-wind'); },
    setMotion(value) { view.rerender(createElement(Fixture, { moving: value })); },
  };
}

function pointerEvent(surface, type, x, y, pointerType = 'mouse', pointerId = 1) {
  const event = new window.MouseEvent(type, { bubbles: true, clientX: x, clientY: y });
  Object.defineProperty(event, 'pointerType', { value: pointerType });
  Object.defineProperty(event, 'pointerId', { value: pointerId });
  act(() => surface.dispatchEvent(event));
}

function pointerMove(surface, x, y, pointerType = 'mouse') {
  pointerEvent(surface, 'pointermove', x, y, pointerType);
}

function flushFrames(timestamp = 0) {
  const pending = [...frames.values()];
  frames.clear();
  act(() => pending.forEach((callback) => callback(timestamp)));
}

function readWind(path) {
  return { d: path.getAttribute('d') ?? '', opacity: Number(path.getAttribute('opacity')) };
}

function assertWindCleared(path) {
  assert.deepEqual(readWind(path), { d: '', opacity: 0 });
}

test('a sky click creates one cloud gust which eases back to still air', () => {
  const fixture = mountAtmosphere();
  assert.equal(fixture.state.gust, 0);
  fireEvent.click(fixture.button, { detail: 1, clientX: 180, clientY: 180 });
  assert.equal(fixture.state.gust, 1);
  assert.equal(frames.size, 1);
  flushFrames(0);
  flushFrames(600);
  const middle = fixture.state.gust;
  assert.ok(Number.isFinite(middle) && middle > 0 && middle < 1);
  flushFrames(1200);
  assert.ok(fixture.state.gust >= 0 && fixture.state.gust < middle, 'The gust must settle rather than pulse repeatedly');
  flushFrames(2400);
  assert.equal(fixture.state.gust, 0);
  assert.equal(frames.size, 0, 'A finished gust must not keep scheduling frames');
});

test('repeated sky clicks and keyboard activation reuse one bounded gust', () => {
  const fixture = mountAtmosphere();
  for (let index = 0; index < 20; index += 1) {
    fireEvent.click(fixture.button, { detail: index % 2, clientX: 180, clientY: 180 });
    assert.equal(fixture.state.gust, 1);
    assert.equal(frames.size, 1, 'Repeated input must replace the gust frame instead of stacking loops');
  }
  flushFrames(0);
  flushFrames(2400);
  assert.equal(fixture.state.gust, 0);
  assert.equal(frames.size, 0);
});

test('visible click reactions use local coordinates, center keyboard input and expire', (context) => {
  context.mock.timers.enable({ apis: ['setTimeout', 'Date'], now: 1000 });
  const fixture = mountAtmosphere();
  fireEvent.click(fixture.button, { detail: 1, clientX: 180, clientY: 180 });
  assert.deepEqual(fixture.state.reactions.map(({ x, y }) => ({ x, y })), [{ x: 100, y: 60 }]);

  fireEvent.click(fixture.button, { detail: 0 });
  assert.deepEqual(fixture.state.reactions.at(-1), { id: fixture.state.reactions.at(-1).id, x: 200, y: 108 });
  fireEvent.click(fixture.button, { detail: 1, clientX: 999, clientY: -50 });
  assert.deepEqual(fixture.state.reactions.at(-1), { id: fixture.state.reactions.at(-1).id, x: 400, y: 0 });
  assert.equal(new Set(fixture.state.reactions.map(({ id }) => id)).size, 3);

  act(() => context.mock.timers.tick(1200));
  assert.equal(fixture.state.reactions.length, 3);
  act(() => context.mock.timers.tick(50));
  assert.deepEqual(fixture.state.reactions, []);
});

test('the continuous wind path uses scene coordinates and follows successive movement in one frame loop', () => {
  const fixture = mountAtmosphere();
  const path = fixture.wind;
  pointerMove(fixture.surface, 180, 180);
  flushFrames(0);
  assertWindCleared(path);
  pointerMove(fixture.surface, 280, 180);
  pointerMove(fixture.surface, 340, 220);
  assert.equal(frames.size, 1, 'Rapid pointer events must share a single frame');
  flushFrames(16);
  flushFrames(32);
  const first = readWind(path);
  assert.ok(first.opacity > 0 && first.opacity <= 1);
  assert.match(first.d, /^M/);
  const coordinates = first.d.match(/-?\d+(?:\.\d+)?/g).map(Number);
  const horizontal = coordinates.filter((_, index) => index % 2 === 0);
  const vertical = coordinates.filter((_, index) => index % 2 !== 0);
  assert.ok(Math.min(...horizontal) >= 90 && Math.min(...horizontal) <= 115, 'The tail stays near the local entry point');
  assert.ok(Math.max(...horizontal) > 180 && Math.max(...horizontal) <= 270, 'The head advances toward the most recent cursor sample');
  assert.ok(vertical.every(y => y >= 50 && y <= 110), 'The trail stays within the local movement corridor');

  pointerMove(fixture.surface, 440, 300);
  flushFrames(48);
  const next = readWind(path);
  assert.equal(fixture.wind, path);
  assert.notEqual(next.d, first.d, 'The curve should extend with the next movement');
  assert.doesNotMatch(next.d, /NaN|Infinity/);
  assert.ok(frames.size <= 1);
});

test('the wind path fades gradually and stops requesting frames when the cursor is idle', () => {
  const fixture = mountAtmosphere();
  pointerMove(fixture.surface, 180, 180);
  flushFrames(0);
  pointerMove(fixture.surface, 440, 220);
  flushFrames(16);
  flushFrames(32);
  let peak = readWind(fixture.wind).opacity;
  assert.ok(peak > 0);

  let faded = false;
  for (let time = 48; time <= 800 && frames.size; time += 16) {
    flushFrames(time);
    const { opacity } = readWind(fixture.wind);
    if (opacity > 0 && opacity < peak) faded = true;
    peak = Math.max(peak, opacity);
  }
  assert.ok(faded, 'The trail must pass through a dimmer visible state before disappearing');
  assertWindCleared(fixture.wind);
  assert.equal(frames.size, 0);
});

test('repeated click feedback stays bounded after the wind path has faded', (context) => {
  context.mock.timers.enable({ apis: ['setTimeout', 'Date'], now: 1000 });
  const fixture = mountAtmosphere();
  for (let index = 0; index < 20; index += 1) {
    pointerMove(fixture.surface, index % 2 ? 440 : 180, 180);
    flushFrames(index * 16);
    assert.ok(frames.size <= 1);
  }
  assert.ok(readWind(fixture.wind).opacity > 0);
  for (let time = 320; time <= 1100 && frames.size; time += 16) flushFrames(time);
  assertWindCleared(fixture.wind);
  assert.equal(frames.size, 0);
  for (let index = 0; index < 12; index += 1) {
    fireEvent.click(fixture.button, { detail: 1, clientX: 180 + index, clientY: 180 });
    assert.ok(fixture.state.reactions.length <= 4);
    assert.equal(frames.size, 1, 'Visible effects must not add perpetual animation-frame loops');
  }
  assert.equal(fixture.state.reactions.length, 4);
  act(() => context.mock.timers.tick(650));
  assert.equal(fixture.state.reactions.length, 4);
  act(() => context.mock.timers.tick(600));
  assert.deepEqual(fixture.state.reactions, []);
});

test('pausing hides and clears visible effects without reviving them when motion resumes', async (context) => {
  context.mock.timers.enable({ apis: ['setTimeout', 'Date'], now: 1000 });
  const fixture = mountAtmosphere();
  fireEvent.click(fixture.button, { detail: 1, clientX: 180, clientY: 180 });
  pointerMove(fixture.surface, 180, 180);
  flushFrames(0);
  pointerMove(fixture.surface, 440, 180);
  flushFrames(16);
  flushFrames(32);
  const activePath = fixture.wind;
  assert.ok(readWind(activePath).opacity > 0);
  assert.equal(fixture.state.reactions.length, 1);

  await act(async () => fixture.setMotion(false));
  assert.equal(fixture.wind, null);
  assertWindCleared(activePath);
  assert.deepEqual(fixture.state.reactions, []);
  assert.equal(frames.size, 0);
  act(() => context.mock.timers.tick(5000));
  fixture.setMotion(true);
  flushFrames(5000);
  assertWindCleared(fixture.wind);
  assert.deepEqual(fixture.state.reactions, []);

  pointerMove(fixture.surface, 180, 180);
  flushFrames(5100);
  assertWindCleared(fixture.wind);
  pointerMove(fixture.surface, 440, 180);
  flushFrames(5116);
  flushFrames(5132);
  assert.ok(readWind(fixture.wind).opacity > 0, 'Resuming accepts fresh feedback');
  fixture.view.unmount();
  act(() => context.mock.timers.tick(2000));
  pointerMove(fixture.surface, 180, 180);
  assert.equal(frames.size, 0);
});

test('cloud parallax is subtle, surface-local and ignores touch movement', () => {
  const fixture = mountAtmosphere();
  pointerMove(fixture.surface, 480, 120);
  flushFrames();
  const background = fixture.state.backgroundRef.current;
  const offsetX = parseFloat(background.style.getPropertyValue('--parallax-x'));
  const offsetY = parseFloat(background.style.getPropertyValue('--parallax-y'));
  assert.ok(offsetX < 0 && Math.abs(offsetX) <= 5);
  assert.ok(offsetY > 0 && Math.abs(offsetY) <= 3);
  pointerMove(fixture.surface, 80, 360);
  flushFrames(16);
  assert.ok(parseFloat(background.style.getPropertyValue('--parallax-x')) > 0);
  assert.ok(parseFloat(background.style.getPropertyValue('--parallax-y')) < 0);
  pointerMove(fixture.surface, 80, 360, 'touch');
  assert.equal(frames.size, 0);
  assert.equal(background.style.getPropertyValue('--parallax-x'), '0px');
  assert.equal(background.style.getPropertyValue('--parallax-y'), '0px');
  assertWindCleared(fixture.wind);
});

test('scrolling and cancelled touches do not trigger a gust, but a short tap does', () => {
  const fixture = mountAtmosphere();
  pointerEvent(fixture.button, 'pointerdown', 180, 180, 'touch', 7);
  pointerEvent(fixture.button, 'pointermove', 180, 250, 'touch', 7);
  pointerEvent(fixture.button, 'pointerup', 180, 250, 'touch', 7);
  fireEvent.click(fixture.button, { detail: 1, clientX: 180, clientY: 250 });
  assert.equal(fixture.state.gust, 0);
  assert.equal(frames.size, 0);
  assertWindCleared(fixture.wind);
  assert.deepEqual(fixture.state.reactions, []);

  pointerEvent(fixture.button, 'pointerdown', 180, 180, 'touch', 8);
  pointerEvent(fixture.button, 'pointercancel', 180, 180, 'touch', 8);
  fireEvent.click(fixture.button, { detail: 1, clientX: 180, clientY: 180 });
  assert.equal(fixture.state.gust, 0);
  assert.equal(frames.size, 0);
  assert.deepEqual(fixture.state.reactions, []);

  pointerEvent(fixture.button, 'pointerdown', 180, 180, 'touch', 9);
  pointerEvent(fixture.button, 'pointerup', 184, 184, 'touch', 9);
  assert.equal(fixture.state.gust, 0, 'Pointer up must not duplicate its following click');
  fireEvent.click(fixture.button, { detail: 1, clientX: 184, clientY: 184 });
  assert.equal(fixture.state.gust, 1);
  assert.equal(frames.size, 1);
  assert.equal(fixture.state.reactions.length, 1);
  assertWindCleared(fixture.wind);
});

test('pausing stops the gust and pending parallax, and blocks keyboard or pointer restarts', async () => {
  const fixture = mountAtmosphere();
  fireEvent.click(fixture.button, { detail: 1, clientX: 180, clientY: 180 });
  pointerMove(fixture.surface, 440, 180);
  assert.ok(frames.size > 0);
  await act(async () => fixture.setMotion(false));
  assert.equal(fixture.state.gust, 0);
  assert.equal(frames.size, 0);
  assert.equal(fixture.state.backgroundRef.current.style.getPropertyValue('--parallax-x'), '0px');
  assert.equal(fixture.state.backgroundRef.current.style.getPropertyValue('--parallax-y'), '0px');

  fireEvent.click(fixture.button, { detail: 1, clientX: 180, clientY: 180 });
  fireEvent.click(fixture.button, { detail: 0 });
  pointerMove(fixture.surface, 440, 180);
  flushFrames(5000);
  assert.equal(fixture.state.gust, 0);
  assert.equal(frames.size, 0);

  fixture.setMotion(true);
  flushFrames(6000);
  assert.equal(fixture.state.gust, 0, 'Resuming must not revive a previous gust');
});

test('a control cancels a queued free-sky frame and centers the clouds', () => {
  const fixture = mountAtmosphere();
  const control = fixture.view.getByRole('button', { name: 'Выбрать город' });
  pointerMove(fixture.surface, 180, 180);
  assert.equal(frames.size, 1);
  pointerMove(control, 440, 180);
  assert.equal(frames.size, 0);
  flushFrames();
  assert.equal(fixture.state.gust, 0);
  assert.equal(fixture.state.backgroundRef.current.style.getPropertyValue('--parallax-x'), '0px');
  assertWindCleared(fixture.wind);

  pointerMove(fixture.surface, 180, 180);
  flushFrames(16);
  pointerMove(fixture.surface, 440, 180);
  flushFrames(32);
  flushFrames(48);
  assert.ok(readWind(fixture.wind).opacity > 0);
  assert.notEqual(fixture.state.backgroundRef.current.style.getPropertyValue('--parallax-x'), '0px');
  pointerMove(control, 440, 180);
  assert.equal(fixture.state.backgroundRef.current.style.getPropertyValue('--parallax-x'), '0px');
  assert.equal(frames.size, 0);
  assertWindCleared(fixture.wind);
});

test('leaving the sky centers cloud parallax and cancels its pending frame', () => {
  const fixture = mountAtmosphere();
  pointerMove(fixture.surface, 180, 180);
  flushFrames(0);
  pointerMove(fixture.surface, 440, 180);
  flushFrames(16);
  flushFrames(32);
  assert.ok(readWind(fixture.wind).opacity > 0);
  assert.notEqual(fixture.state.backgroundRef.current.style.getPropertyValue('--parallax-x'), '0px');
  pointerMove(fixture.surface, 180, 180);
  assert.equal(frames.size, 1);
  fireEvent.pointerLeave(fixture.surface);
  assert.equal(frames.size, 0);
  assert.equal(fixture.state.backgroundRef.current.style.getPropertyValue('--parallax-x'), '0px');
  assert.equal(fixture.state.backgroundRef.current.style.getPropertyValue('--parallax-y'), '0px');
  assertWindCleared(fixture.wind);
});

test('unmount cancels the shared gust and pointer frames and removes sky listeners', () => {
  const fixture = mountAtmosphere();
  fireEvent.click(fixture.button, { detail: 0 });
  pointerMove(fixture.surface, 440, 180);
  assert.ok(frames.size > 0);
  fixture.view.unmount();
  assert.equal(frames.size, 0);
  pointerMove(fixture.surface, 180, 300);
  flushFrames(3000);
  assert.equal(frames.size, 0);
});
