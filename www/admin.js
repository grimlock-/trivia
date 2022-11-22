var pop_waiting = false;

function add_user_admin(u)
{
	users[u.id] = u;
	user_list.push(u);
	let d = document.createElement("div");
	d.classList.add("user");
	d.dataset.id = u.id;
	if(!u.image || u.image == "default")
		d.innerHTML = "<img class='usericon' src='white.jpg' width='60' height='60' /><div class='username'>" + u.name + "</div>";
	else
		d.innerHTML = "<img class='usericon' src='" + u.image + "' width='60' height='60' /><div class='username'>" + u.name + "</div>";
	if(u.isAdmin)
		d.classList.add("admin");
	document.getElementById("userlist").appendChild(d);
	u.elements.push(d);
}
function msg_admin_init(msg)
{
	add_user(me, true);
	for (let u of msg.users) {
		add_user_admin(new User(u), false);
	}
	ws_promote();
	//saved name
	let savedName = localStorage.getItem("name") || "Admin";
	if(me.name != savedName)
		ws_namechange(savedName);
	//saved image
	let savedImage = localStorage.getItem("image");
	if(savedImage)
		request_image_change(savedImage);
	//screen transition
	document.getElementById("connection_screen").classList.add("hidden");
	document.getElementById("main_screen").classList.remove("hidden");
}
function msg_scores_update(message)
{
	for(let pair of message.list)
	{
		let u = get_user(pair.id);
		u.score = pair.score;
	}
	//Draw to admin's personal scoreboard at some point
}
function msg_answer_queue_admin(message)
{
	pop_waiting = false;
	let queue = document.getElementById("answer_queue");
	let ans = document.getElementById("answering");
	ans.innerHTML = "";
	while(queue.lastChild.id != "spotlight")
		queue.removeChild(queue.lastChild);
	if(message.list.length > 0)
		draw_answer_queue(message.list);
}
function draw_answer_queue(queue)
{
	let answering = queue.shift();
	let u = get_user(answering);
	let d = document.createElement("div");
	d.classList.add("user");
	d.dataset.id = u.id;
	if(!u.image || u.image == "default")
		d.innerHTML = "<img class='usericon' src='white.jpg' width='60' height='60' /><div class='username'>" + u.name + "</div>";
	else
		d.innerHTML = "<img class='usericon' src='" + u.image + "' width='60' height='60' /><div class='username'>" + u.name + "</div>";
	document.getElementById("answering").appendChild(d);
	
	for(let id of queue)
	{
		u = get_user(id);
		d = document.createElement("div");
		d.classList.add("user");
		d.dataset.id = u.id;
		if(!u.image || u.image == "default")
			d.innerHTML = "<img class='usericon' src='white.jpg' width='60' height='60' /><div class='username'>" + u.name + "</div>";
		else
			d.innerHTML = "<img class='usericon' src='" + u.image + "' width='60' height='60' /><div class='username'>" + u.name + "</div>";
		document.getElementById("answer_queue").appendChild(d);
		u.elements.push(d);
	}
}
function admin_release_lock()
{
	request_release();
}


/*
 * WebSocket Messages
 */
function ws_set_question(question)
{
	conn.send(JSON.stringify({ action: "setquestion", question: question }));
}
function ws_clear_queue()
{
	conn.send(JSON.stringify({ action: "clearqueue" }));
}
function ws_promote()
{
	conn.send(JSON.stringify({ action: "promote" }));
}
function ws_pop()
{
	conn.send(JSON.stringify({ action: "pop" }));
}
function ws_set_score(id, score)
{
	conn.send(JSON.stringify({ action: "setscore", id: id, score: score }));
}
function ws_show_scores()
{
	//test_scores();
	conn.send(JSON.stringify({ action: "showscores" }));
}
/*
 * END WeSocket Messages
 */

document.addEventListener("DOMContentLoaded", function(e) {
	document.getElementById("clear_queue").addEventListener("click", ws_clear_queue);
	document.getElementById("letter_q").addEventListener("click", function(e) {
		let q = prompt("Enter question text");
		if(q)
			ws_set_question(q);
	});
	document.getElementById("show_scores").addEventListener("click", ws_show_scores);
	document.getElementById("correct_button").addEventListener("click", function(e) {
		if(!pop_waiting)
		{
			let ele = document.querySelector("#answering *[data-id]");
			let u = get_user(ele.dataset.id);
			ws_set_score(u.id, u.score + 1);
			ws_pop();
			pop_waiting = true;
		}
	});
	document.getElementById("incorrect_button").addEventListener("click", function(e) {
		if(!pop_waiting)
		{
			ws_pop();
			pop_waiting = true;
		}
	});
});