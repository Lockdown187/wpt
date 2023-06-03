// Appends a list item with `innerHTML` to the document's 'list' element.
function log(innerHTML) {
  const li = document.createElement('li');
  li.innerHTML = innerHTML;
  document.getElementById('list').appendChild(li);
}

// Grants `window-management` permission and caches `window.screenDetails`.
async function setUpWindowManagement(test) {
  assert_true(
    'getScreenDetails' in self && 'isExtended' in screen,
    `API not supported; use Chromium (not content_shell)`);
  if (!screen.isExtended)
    log(`WARNING: Use multiple screens for full test coverage`);
  if (window.location.href.startsWith('file'))
    log(`WARNING: Run via 'wpt serve'; file URLs lack permission support`);

  try {  // Support manual testing where test_driver is not running.
    await test_driver.set_permission({ name: 'window-management' }, 'granted');
  } catch {
  }
  await buttonClick(test, 'Request screen details');
  window.screenDetails = await window.getScreenDetails();
  assert_true(!!window.screenDetails, 'Error getting screen details');

  // TODO(msw@chromium.org): Resolve delayed currentScreen init when running:
  // ./wpt run chrome window-placement/multi-screen-* 
  let currentScreen = window.screenDetails.currentScreen;
  log(`Window ${windowLog(window)} on screen ${screenLog(currentScreen)}`);
  await new Promise(r => setTimeout(r, 1000));
  currentScreen = window.screenDetails.currentScreen;
  log(`Window ${windowLog(window)} on screen ${screenLog(currentScreen)}`);
}

// Appends a button with `innerHTML` to the document's `list` element.
// Waits for a test driver or manual click, and disables the button afterwards.
async function buttonClick(test, innerHTML) {
  const button = document.createElement('button');
  button.innerHTML = innerHTML;
  const li = document.createElement('li');
  li.appendChild(button)
  document.getElementById('list').appendChild(li);
  const click = new EventWatcher(test, button, ['click']).wait_for('click');
  try {  // Support manual testing where test_driver is not running.
    await test_driver.click(button);
  } catch {
  }
  await click;
  button.disabled = true;
}

// Returns true if window `w` bounds are on screen `s` with error `e`.
function isWindowOnScreen(w, s, e = 100) {
  log(`isWindowOnScreen w: ${windowLog(w)} s: ${screenLog(s)}`);                        // MSW 
  return (w.screenLeft >= s.left - e) && (w.screenTop >= s.top - e) &&
          (w.screenLeft + w.outerWidth <= s.left + s.width + e) &&
          (w.screenTop + w.outerHeight <= s.top + s.height + e);
}

// Polls until `condition` is true, with the given `interval` and `duration`.
// Returns a promise that will be resolved on success or timeout.
// TODO(msw@chromium.org): Resolve incorrect originalScreen in multi-screen-fullscreen, when running via: 
// ./wpt run chrome window-placement/multi-screen-* 
async function poll(condition, interval = 100, duration = 30000) { //3000) {        // MSW
  const timeout = Date.now() + duration;
  const loop = async (resolve, reject) => {
    if (condition() || Date.now() > timeout)
      resolve();
    else
      setTimeout(loop, interval, resolve, reject);
  }
  return new Promise(loop);
}

// Asserts window `w` bounds and currentScreen match screen `s`.
// Awaits pending changes, and permits small bounds errors.
// Fullscreen promises may resolve before bounds change; e.g. crbug.com/1330724.
async function assertWindowOnScreen(w, s) {
  log(`assertWindowOnScreen w: ${windowLog(w)} s: ${screenLog(s)}`);                         // MSW 
  // if (w.screenDetails.currentScreen != s) {
  //   await new Promise(r => w.screenDetails.addEventListener(
  //     'currentscreenchange',
  //     () => {
  //       if (w.screenDetails.currentScreen == s)
  //         r();
  //     }));
  // }
  await poll(() => { return s === w.screenDetails.currentScreen; });
  assert_equals(screenLog(s), screenLog(w.screenDetails.currentScreen));

  await poll(() => { return isWindowOnScreen(w, s); });
  assert_true(isWindowOnScreen(w, s), `${windowLog(w)} on ${screenLog(s)}`);
}

// Returns a string with the label and bounds of screen `s` for logging.
function screenLog(s) {
  return `'${s.label}': (${s.left},${s.top} ${s.width}x${s.height})`;
}

// Returns a string with the bounds of window `w` for logging.
function windowLog(w) {
  return `(${w.screenLeft},${w.screenTop} ${w.outerWidth}x${w.outerHeight})`;
}