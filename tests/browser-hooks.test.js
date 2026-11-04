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
  return { view, surface, button, get state() { return state; }, setMotion(value) { view.rerender(createElement(Fixture, { moving: value })); } };
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

test('cursor feedback follows local movement, throttles small samples and fades out', (context) => {
  context.mock.timers.enable({ apis: ['setTimeout', 'Date'], now: 1000 });
  const fixture = mountAtmosphere();
  pointerMove(fixture.surface, 180, 180);
  flushFrames();
  assert.equal(fixture.surface.style.getPropertyValue('--cursor-x'), '100px');
  assert.equal(fixture.surface.style.getPropertyValue('--cursor-y'), '60px');
  assert.equal(fixture.surface.style.getPropertyValue('--cursor-visible'), '1');
  assert.equal(fixture.state.trails.length, 1);
  assert.deepEqual(fixture.state.trails.map(({ x, y, angle }) => ({ x, y, angle })), [{ x: 100, y: 60, angle: 0 }]);

  pointerMove(fixture.surface, 280, 180);
  flushFrames();
  assert.equal(fixture.state.trails.length, 1, 'Rapid events must not create a trail on every pointer frame');
  act(() => context.mock.timers.tick(80));
  pointerMove(fixture.surface, 185, 180);
  flushFrames();
  assert.equal(fixture.state.trails.length, 1, 'Tiny movements must not stack visible wisps');
  pointerMove(fixture.surface, 280, 180);
  flushFrames();
  assert.equal(fixture.state.trails.length, 2);
  assert.equal(fixture.state.trails.at(-1).angle, 0);
  act(() => context.mock.timers.tick(80));
  pointerMove(fixture.surface, 280, 300);
  flushFrames();
  assert.equal(fixture.state.trails.at(-1).angle, 90);
  assert.ok(fixture.state.trails.every(({ scale }) => Number.isFinite(scale) && scale > 0 && scale < 3));

  act(() => context.mock.timers.tick(650));
  assert.deepEqual(fixture.state.trails, []);
});

test('the cursor follower fades when idle, refreshes on small movement and cancels on leave or pause', async (context) => {
  context.mock.timers.enable({ apis: ['setTimeout', 'Date'], now: 1000 });
  const fixture = mountAtmosphere();
  const style = fixture.surface.style;
  const setProperty = context.mock.method(style, 'setProperty');
  pointerMove(fixture.surface, 180, 180);
  flushFrames();
  act(() => context.mock.timers.tick(120));
  assert.equal(style.getPropertyValue('--cursor-visible'), '1');

  pointerMove(fixture.surface, 185, 185);
  flushFrames();
  assert.equal(fixture.state.trails.length, 1, 'Refreshing the follower must not require a new trail sample');
  act(() => context.mock.timers.tick(60));
  assert.equal(style.getPropertyValue('--cursor-visible'), '1', 'A previous idle deadline must not hide fresh feedback');
  act(() => context.mock.timers.tick(120));
  assert.equal(style.getPropertyValue('--cursor-visible'), '0');

  pointerMove(fixture.surface, 220, 220);
  flushFrames();
  fireEvent.pointerLeave(fixture.surface);
  assert.equal(style.getPropertyValue('--cursor-visible'), '0');
  setProperty.mock.resetCalls();
  act(() => context.mock.timers.tick(180));
  assert.equal(setProperty.mock.calls.filter(({ arguments: args }) => args[0] === '--cursor-visible').length, 0,
    'Leaving must cancel the idle timer rather than retain a delayed style update');

  pointerMove(fixture.surface, 250, 250);
  flushFrames();
  await act(async () => fixture.setMotion(false));
  assert.equal(style.getPropertyValue('--cursor-visible'), '0');
  setProperty.mock.resetCalls();
  act(() => context.mock.timers.tick(180));
  assert.equal(setProperty.mock.calls.filter(({ arguments: args }) => args[0] === '--cursor-visible').length, 0,
    'Pausing must cancel the pending idle timer');
});

test('repeated pointer and click feedback stays bounded while earlier effects expire', (context) => {
  context.mock.timers.enable({ apis: ['setTimeout', 'Date'], now: 1000 });
  const fixture = mountAtmosphere();
  for (let index = 0; index < 20; index += 1) {
    pointerMove(fixture.surface, index % 2 ? 440 : 180, 180);
    flushFrames();
    assert.ok(fixture.state.trails.length <= 10);
    act(() => context.mock.timers.tick(65));
  }
  assert.ok(fixture.state.trails.length > 0);
  for (let index = 0; index < 12; index += 1) {
    fireEvent.click(fixture.button, { detail: 1, clientX: 180 + index, clientY: 180 });
    assert.ok(fixture.state.reactions.length <= 4);
    assert.equal(frames.size, 1, 'Visible effects must not add perpetual animation-frame loops');
  }
  assert.equal(fixture.state.reactions.length, 4);
  act(() => context.mock.timers.tick(650));
  assert.deepEqual(fixture.state.trails, []);
  assert.equal(fixture.state.reactions.length, 4);
  act(() => context.mock.timers.tick(600));
  assert.deepEqual(fixture.state.reactions, []);
});

test('pausing hides and clears visible effects without reviving them when motion resumes', async (context) => {
  context.mock.timers.enable({ apis: ['setTimeout', 'Date'], now: 1000 });
  const fixture = mountAtmosphere();
  fireEvent.click(fixture.button, { detail: 1, clientX: 180, clientY: 180 });
  pointerMove(fixture.surface, 440, 180);
  flushFrames();
  assert.equal(fixture.state.trails.length, 1);
  assert.equal(fixture.state.reactions.length, 1);

  await act(async () => fixture.setMotion(false));
  assert.deepEqual(fixture.state.trails, []);
  assert.deepEqual(fixture.state.reactions, []);
  assert.equal(fixture.surface.style.getPropertyValue('--cursor-visible'), '0');
  assert.equal(frames.size, 0);
  act(() => context.mock.timers.tick(5000));
  fixture.setMotion(true);
  flushFrames(5000);
  assert.deepEqual(fixture.state.trails, []);
  assert.deepEqual(fixture.state.reactions, []);

  pointerMove(fixture.surface, 440, 180);
  flushFrames(5100);
  assert.equal(fixture.state.trails.length, 1, 'Resuming accepts fresh feedback');
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
  flushFrames();
  assert.ok(parseFloat(background.style.getPropertyValue('--parallax-x')) > 0);
  assert.ok(parseFloat(background.style.getPropertyValue('--parallax-y')) < 0);
  pointerMove(fixture.surface, 80, 360, 'touch');
  assert.equal(frames.size, 0);
  assert.equal(background.style.getPropertyValue('--parallax-x'), '0px');
  assert.equal(background.style.getPropertyValue('--parallax-y'), '0px');
  assert.equal(fixture.surface.style.getPropertyValue('--cursor-visible'), '0');
});

test('scrolling and cancelled touches do not trigger a gust, but a short tap does', () => {
  const fixture = mountAtmosphere();
  pointerEvent(fixture.button, 'pointerdown', 180, 180, 'touch', 7);
  pointerEvent(fixture.button, 'pointermove', 180, 250, 'touch', 7);
  pointerEvent(fixture.button, 'pointerup', 180, 250, 'touch', 7);
  fireEvent.click(fixture.button, { detail: 1, clientX: 180, clientY: 250 });
  assert.equal(fixture.state.gust, 0);
  assert.equal(frames.size, 0);
  assert.deepEqual(fixture.state.trails, []);
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
  assert.deepEqual(fixture.state.trails, []);
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
  assert.deepEqual(fixture.state.trails, [], 'A cancelled sky frame must not leave a trail over a control');
  assert.equal(fixture.surface.style.getPropertyValue('--cursor-visible'), '0');

  pointerMove(fixture.surface, 440, 180);
  flushFrames();
  assert.notEqual(fixture.state.backgroundRef.current.style.getPropertyValue('--parallax-x'), '0px');
  pointerMove(control, 440, 180);
  assert.equal(fixture.state.backgroundRef.current.style.getPropertyValue('--parallax-x'), '0px');
  assert.equal(frames.size, 0);
  assert.equal(fixture.surface.style.getPropertyValue('--cursor-visible'), '0');
});

test('leaving the sky centers cloud parallax and cancels its pending frame', () => {
  const fixture = mountAtmosphere();
  pointerMove(fixture.surface, 440, 180);
  flushFrames();
  assert.notEqual(fixture.state.backgroundRef.current.style.getPropertyValue('--parallax-x'), '0px');
  pointerMove(fixture.surface, 180, 180);
  assert.equal(frames.size, 1);
  fireEvent.pointerLeave(fixture.surface);
  assert.equal(frames.size, 0);
  assert.equal(fixture.state.backgroundRef.current.style.getPropertyValue('--parallax-x'), '0px');
  assert.equal(fixture.state.backgroundRef.current.style.getPropertyValue('--parallax-y'), '0px');
  assert.equal(fixture.surface.style.getPropertyValue('--cursor-visible'), '0');
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
