function request_set_question()
{
	let question = document.getElementById("question_input").value;
	console.log(question);
	document.getElementById("question_input").value = "";
	conn.send(JSON.stringify({ action: "setquestion", question: question }));
}

function request_promote()
{
	conn.send(JSON.stringify({ action: "promote" }));
}

function request_release()
{
	conn.send(JSON.stringify({ action: "release" }));
}
