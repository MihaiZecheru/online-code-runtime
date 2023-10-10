To run code and receive an output, send post to https://bv.mzecheru.com/execute/<language>/, and to run code with inputs and outputs, connect a websocket to https://bv.mzecheru.com/io/<language>/, where <language> is python, javascript, typescript, c, cpp, csharp, rust, or lua.

To run code using /execute/, send { "program": "" } in the body.

To run code using /io/, form a websocket connection with a /io/ url and send your program using the following format: "PROGRAM:your code can go here, just make sure to start with the word 'program' in all caps followed by a colon.

The websocket server will capture and send all outputs from your program, and those messages will be a stringified JSON object that looks like this: { "output": "this is output captured by the program", "error": "errors will be written here if they occurred" }.

The websocket knows to listen for an input if it sees "(INPUT)" anywhere in the program's output. Modify your code's input() and cout statements to contain "(INPUT)" Send expected inputs over the websocket server by starting the message with "INPUT:this is the stuff you want to be treated as an input".
