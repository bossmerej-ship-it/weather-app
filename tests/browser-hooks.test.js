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

function flushFrames() {
  const pending = [...frames.values()];
  frames.clear();
  act(() => pending.forEach((callback) => callback(0)));
}

test('scene clicks use card-local coordinates, keyboard uses its center and bursts stay bounded', () => {
  const fixture = mountAtmosphere();
  fireEvent.click(fixture.button, { detail: 1, clientX: 180, clientY: 180 });
  assert.deepEqual(fixture.state.reactions.map(({ x, y }) => ({ x, y })), [{ x: 100, y: 60 }]);
  fireEvent.click(fixture.button, { detail: 0 });
  assert.deepEqual(fixture.state.reactions.at(-1), { id: 2, x: 200, y: 108 });
  for (let index = 0; index < 8; index += 1) fireEvent.click(fixture.button, { detail: 1, clientX: 180, clientY: 180 });
  assert.equal(fixture.state.reactions.length, 6);
  assert.deepEqual(fixture.state.reactions.map((item) => item.id), [5, 6, 7, 8, 9, 10]);
});

test('parallax is card-local, ignores touch movement and stops when paused', () => {
  const fixture = mountAtmosphere();
  pointerMove(fixture.surface, 480, 120);
  flushFrames();
  const background = fixture.state.backgroundRef.current;
  assert.equal(background.style.getPropertyValue('--parallax-x'), '-7px');
  assert.equal(background.style.getPropertyValue('--parallax-y'), '5px');
  pointerMove(fixture.surface, 80, 360, 'touch');
  assert.equal(frames.size, 0);
  fixture.setMotion(false);
  assert.equal(background.style.getPropertyValue('--parallax-x'), '0px');
  assert.equal(background.style.getPropertyValue('--parallax-y'), '0px');
  pointerMove(fixture.surface, 480, 120);
  assert.equal(frames.size, 0);
  fixture.setMotion(true);
  pointerMove(fixture.surface, 480, 120);
  fixture.view.unmount();
  assert.equal(frames.size, 0);
  pointerMove(fixture.surface, 80, 360);
  assert.equal(frames.size, 0);
});

test('a short touch reacts once, while scrolling or cancelling suppresses the generated click', () => {
  const fixture = mountAtmosphere();
  pointerEvent(fixture.button, 'pointerdown', 180, 180, 'touch', 7);
  pointerEvent(fixture.button, 'pointerup', 184, 184, 'touch', 7);
  assert.equal(fixture.state.reactions.length, 0, 'Pointer up must not duplicate the subsequent click');
  fireEvent.click(fixture.button, { detail: 1, clientX: 184, clientY: 184 });
  assert.equal(fixture.state.reactions.length, 1);

  pointerEvent(fixture.button, 'pointerdown', 180, 180, 'touch', 8);
  pointerEvent(fixture.button, 'pointermove', 180, 250, 'touch', 8);
  pointerEvent(fixture.button, 'pointerup', 180, 250, 'touch', 8);
  fireEvent.click(fixture.button, { detail: 1, clientX: 180, clientY: 250 });
  assert.equal(fixture.state.reactions.length, 1, 'A scroll gesture must not trigger atmospheric effects');

  pointerEvent(fixture.button, 'pointerdown', 180, 180, 'touch', 9);
  pointerEvent(fixture.button, 'pointercancel', 180, 180, 'touch', 9);
  fireEvent.click(fixture.button, { detail: 1, clientX: 180, clientY: 180 });
  assert.equal(fixture.state.reactions.length, 1, 'A cancelled touch must not trigger an effect');
  pointerMove(fixture.surface, 180, 250, 'touch');
  assert.equal(fixture.state.trails.length, 0);
  assert.equal(frames.size, 0);
});

test('pausing removes existing effects and prevents pointer or keyboard reactions', async () => {
  const fixture = mountAtmosphere();
  fireEvent.click(fixture.button, { detail: 1, clientX: 180, clientY: 180 });
  pointerMove(fixture.surface, 440, 180);
  flushFrames();
  assert.equal(fixture.state.reactions.length, 1);
  assert.equal(fixture.state.trails.length, 1);
  await act(async () => fixture.setMotion(false));
  assert.equal(fixture.state.reactions.length, 0);
  assert.equal(fixture.state.trails.length, 0);
  fireEvent.click(fixture.button, { detail: 1, clientX: 180, clientY: 180 });
  fireEvent.click(fixture.button, { detail: 0 });
  pointerMove(fixture.surface, 440, 180);
  flushFrames();
  assert.equal(fixture.state.reactions.length, 0);
  assert.equal(fixture.state.trails.length, 0);
  assert.equal(fixture.state.backgroundRef.current.style.getPropertyValue('--parallax-x'), '0px');
  assert.equal(fixture.surface.style.getPropertyValue('--cursor-visible'), '0');
});

test('interactive controls do not create trails or move the sky', () => {
  const fixture = mountAtmosphere();
  const control = fixture.view.getByRole('button', { name: 'Выбрать город' });
  pointerMove(control, 440, 180);
  flushFrames();
  assert.equal(fixture.state.trails.length, 0);
  assert.equal(fixture.state.backgroundRef.current.style.getPropertyValue('--parallax-x'), '0px');
  assert.equal(frames.size, 0);
});

test('moving onto a control cancels an already queued sky frame and hides the cursor glow', () => {
  const fixture = mountAtmosphere();
  const control = fixture.view.getByRole('button', { name: 'Выбрать город' });
  pointerMove(fixture.surface, 180, 180);
  assert.equal(frames.size, 1);
  pointerMove(control, 440, 180);
  assert.equal(frames.size, 0, 'A control must cancel the previous free-sky frame');
  flushFrames();
  assert.equal(fixture.state.trails.length, 0);
  assert.equal(fixture.surface.style.getPropertyValue('--cursor-visible'), '0');

  pointerMove(fixture.surface, 440, 180);
  flushFrames();
  assert.equal(fixture.surface.style.getPropertyValue('--cursor-visible'), '1');
  pointerMove(control, 440, 180);
  assert.equal(fixture.surface.style.getPropertyValue('--cursor-visible'), '0');
  assert.equal(frames.size, 0);
});

test('directional trails stay finite and bounded while touch and leaving hide the cursor glow', (context) => {
  context.mock.timers.enable({ apis: ['setTimeout', 'Date'], now: 1000 });
  const fixture = mountAtmosphere();
  pointerMove(fixture.surface, 180, 180);
  flushFrames();
  assert.equal(fixture.state.trails.at(-1).angle, 0, 'The first sample has no preceding direction');

  act(() => context.mock.timers.tick(80));
  pointerMove(fixture.surface, 440, 180);
  flushFrames();
  assert.equal(fixture.state.trails.at(-1).angle, 0, 'Horizontal movement points along the horizontal axis');
  act(() => context.mock.timers.tick(80));
  pointerMove(fixture.surface, 440, 340);
  flushFrames();
  assert.equal(fixture.state.trails.at(-1).angle, 90, 'Vertical movement follows the cursor direction');
  for (const trail of fixture.state.trails) {
    assert.ok(Number.isFinite(trail.angle) && trail.angle >= -180 && trail.angle <= 180);
    assert.ok(Number.isFinite(trail.stretch) && trail.stretch >= 1 && trail.stretch <= 1.8);
  }
  assert.equal(parseFloat(fixture.surface.style.getPropertyValue('--cursor-x')), 360);
  assert.equal(parseFloat(fixture.surface.style.getPropertyValue('--cursor-y')), 220);
  assert.equal(fixture.surface.style.getPropertyValue('--cursor-visible'), '1');

  const trailCount = fixture.state.trails.length;
  pointerMove(fixture.surface, 180, 180, 'touch');
  assert.equal(frames.size, 0);
  assert.equal(fixture.state.trails.length, trailCount);
  assert.equal(fixture.surface.style.getPropertyValue('--cursor-visible'), '0');
  pointerMove(fixture.surface, 440, 340);
  flushFrames();
  fireEvent.pointerLeave(fixture.surface);
  assert.equal(frames.size, 0);
  assert.equal(fixture.surface.style.getPropertyValue('--cursor-visible'), '0');
});

test('air trails are throttled, bounded, expire and clean up on unmount', (context) => {
  context.mock.timers.enable({ apis: ['setTimeout', 'Date'], now: 1000 });
  const fixture = mountAtmosphere();
  pointerMove(fixture.surface, 180, 180);
  flushFrames();
  pointerMove(fixture.surface, 440, 180);
  flushFrames();
  assert.equal(fixture.state.trails.length, 1, 'Movement within 80ms must share the same trail sample');

  for (let index = 0; index < 15; index += 1) {
    act(() => context.mock.timers.tick(80));
    pointerMove(fixture.surface, index % 2 ? 180 : 440, 180);
    flushFrames();
  }
  assert.ok(fixture.state.trails.length <= 12);
  act(() => context.mock.timers.tick(900));
  assert.equal(fixture.state.trails.length, 0);

  pointerMove(fixture.surface, 180, 300);
  flushFrames();
  assert.equal(fixture.state.trails.length, 1);
  fixture.view.unmount();
  assert.equal(frames.size, 0);
  act(() => context.mock.timers.tick(2000));
  pointerMove(fixture.surface, 440, 180);
  assert.equal(frames.size, 0);
});
