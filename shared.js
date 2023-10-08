import fs from 'fs';

export function get_program(req, res) {
  return req.body?.program;
}

export function filepath(ext) {
  return `./code/${Date.now()}.${ext}`;
}

export function handle_writefile_err(err, res, filepath) {
  if (err) {
    console.error(err);
    res.status(500).send({ error: 'Error writing the file.' });
    remove_file(filepath);
    return true;
  }
}

/**
 * 
 * @param {*} err err object from exec callback
 * @param {*} res res object from express callback
 * @param {*} filepath path to the file
 * @param {*} stderr stderr object from exec callback
 * @param {*} compile if true, errors will say 'error compiling' instead of 'error executing'
 */
export function handle_exec_err(err, res, filepath, stderr = null, compile = false) {
  if (err) {
    res.status(500).send({ error: `Error ${ compile ? 'compiling' : 'executing' } the program${ stderr ? (':\n' + stderr) : '.' }` });
    remove_file(filepath);
    return true;
  }
}

export function remove_file(filepath, exceptions = []) {
  // remove extension
  const fp = '.' + filepath.split('.').slice(0, -1).join('');

  // remove all possible extensions
  for (const ext of ['py', 'js', 'ts', 'c', 'cpp', 'cs', 'lua', 'exe']) {
    if (!fs.existsSync(`${fp}.${ext}`)) continue;
    if (exceptions.includes(ext)) continue;
    fs.unlink(`${fp}.${ext}`, (err) => {
      if (err) console.error(err);
    });
  }
}