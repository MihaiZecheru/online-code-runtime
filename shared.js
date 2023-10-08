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

export function handle_exec_err(err, res, filepath, compile = false) {
  if (err) {
    console.log(err)
    res.status(500).send({ error: `Error ${ compile ? 'compiling' : 'executing' } the program.` });
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