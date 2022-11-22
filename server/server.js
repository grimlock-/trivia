"use strict";
const ws = require("ws");

//Globals
let nextId = 0;
let users = [];
let answer_queue = [];
let lock_tid = 0;
let question = "";

//Util-ish functikons
function GetAdmins()
{
	let ret = [];
	for(let u of users)
	{
		if(u.isAdmin)
			ret.push(u);
	}
	return ret;
}
function GetUserById(id)
{
	for(let u of users)
	{
		if(u.id == id)
			return u;
	}
	return null;
}


//{ Broadcast messages
function blast_message(message)
{
	for(let u of users)
	{
		u.conn.send(message);
	}
}
function blast_message_new_admin(id)
{
	let message = JSON.stringify({
		blah: "newadmin",
		id: id
	});
	blast_message(message);
}
function blast_message_no_admin()
{
	let message = JSON.stringify({
		blah: "noadmin"
	});
	blast_message(message);
}
function blast_message_name_change(user)
{
	let message = JSON.stringify({
		blah: "namechange",
		id: user.id,
		name: user.name
	});
	blast_message(message);
}
function blast_message_set_question(question)
{
	let message = JSON.stringify({
		blah: "setquestion",
		question: question
	});
	blast_message(message);
}
//Set user's image
function blast_message_set_image(id, dataUrl)
{
	let message = JSON.stringify({
		blah: "setimage",
		id: id,
		dataUrl: dataUrl
	});
	blast_message(message);
}
//For when a user trys to get the lock
function blast_message_user_buzz(id)
{
	let message = JSON.stringify({
		blah: "buzz",
		id: id
	});
	blast_message(message);
}
function blast_message_scores()
{
	if(users.length < 2)
		return;
	
	let scores = [];
	for(let u of users)
	{
		scores.push({
			name: u.name,
			score: u.score
		});
	}
	let message = JSON.stringify({
		blah: "scores",
		list: scores
	});
	blast_message(message);
}
function blast_message_answer_queue()
{
	let message = JSON.stringify({
		blah: "answerqueue",
		list: answer_queue
	});
	blast_message(message);
}
//}
//{ Targeted messages
function send_message_init(user)
{
	let message = {
		blah: "init",
		users: [],
		question: question,
		you: {
			id: user.id,
			name: user.name,
			isAdmin: user.isAdmin,
			image: "default"
		}
	};
	for(let u of users)
	{
		if(u.id == message.you.id)
			continue;
		message.users.push({
			id: u.id,
			name: u.name,
			isAdmin: u.isAdmin,
			image: u.image,
			score: u.score
		});
	}
	message = JSON.stringify(message);
	user.conn.send(message);
}
function send_message_new_user(user)
{
	let message = JSON.stringify({
		blah: "newuser",
		user: {
			id: user.id,
			name: user.name,
			isAdmin: user.isAdmin,
			image: "default"
		}
	});
	for(let u of users)
	{
		if(u.id == user.id)
			continue;
		u.conn.send(message);
	}
}
function send_message_user_left(id)
{
	let message = JSON.stringify({
		blah: "userleave",
		id: id
	});
	for(let u of users)
	{
		if(u.id == id)
			continue;
		u.conn.send(message);
	}
}
function send_admin_scores()
{
	let sc = [];
	for(let u of users)
	{
		if(u.isAdmin)
			continue;
		sc.push({id: u.id, score: u.score});
	}
	let message = JSON.stringify({
		blah: "scores_update",
		list: sc
	});
	for(let a of GetAdmins())
		a.conn.send(message);
}
//}

const server = new ws.Server({host: "localhost", port: 8080});
server.on("connection", function(conn){
	let uid = ++nextId;
	let newuser = {
		id: uid,
		name: "USER "+uid,
		isAdmin: false,
		image: "default",
		score: 0,
		conn: conn
	};

	console.log("User " + uid + " joined");
	
	conn.on("message", function(msg){
		let message = JSON.parse(msg);
		switch(message.action)
		{
			case "promote":
				if(newuser.isAdmin || answer_queue.indexOf(newuser.id) != -1)
					return;
				newuser.isAdmin = true;
				console.log("Promoted " + newuser.name);
				blast_message_new_admin(uid);
			break;
			
			case "setname":
				if(message.name.length == 0 || newuser.name == message.name)
					return;
				console.log("Changing user " + newuser.id + "'s name from \"" + newuser.name + "\" to \"" + message.name + "\"");
				newuser.name = message.name;
				blast_message_name_change(newuser);
			break;
			
			case "setimage":
				console.log(newuser.name + " changed their image");
				newuser.image = message.image;
				blast_message_set_image(uid, message.image);
			break;
			
			case "lock":
				console.log(newuser.name + " requested lock");
				if(newuser.isAdmin)
					return;
				if(answer_queue.length == 0)
				{
					console.log("Giving lock to " + newuser.name);
					answer_queue.push(uid);
					blast_message_answer_queue();
				}
				else if(answer_queue.indexOf(uid) == -1)
				{
					answer_queue.push(uid);
					blast_message_answer_queue();
				}
				//blast_message_user_buzz(id);
			break;
				
			//{ Admin actions
			case "setquestion":
				if(newuser.isAdmin && !lock_tid)
				{
					console.log("Question set to " + message.question);
					question = message.question;
					answer_queue = [newuser.id];
					lock_tid = setTimeout(function(){
						answer_queue = [];
						lock_tid = 0;
						blast_message_answer_queue();
					}, 4000);
					blast_message_set_question(message.question);
				}
			break;
				
			case "pop":
				if(!newuser.isAdmin || answer_queue.length == 0)
					return;
				
				console.log("Shifting lock to next in queue");
				answer_queue.shift();
				blast_message_answer_queue();
			break;

			case "clearqueue":
				if(!newuser.isAdmin || answer_queue.length == 0)
					return;

				answer_queue = [];
				blast_message_answer_queue();
			break;
				
			case "showscores":
				if(newuser.isAdmin)
					blast_message_scores();
			break;
				
			case "setscore":
				if(!newuser.isAdmin || answer_queue.length == 0)
					return;
				
				let u = GetUserById(message.id);
				if(u) {
					console.log("Setting " + u.name + "\'s score to " + message.score);
					u.score = message.score;
					send_admin_scores();
				}
			break;
			//}
		}
	});
	conn.on("close", function(e){
		console.log("User " + uid + " (" + newuser.name + ") left");
		for(let i = 0; i < users.length; ++i)
		{
			if(users[i].id == uid)
				users.splice(i, 1);
		}
		if(users.length == 0)
		{
			console.log("All users have left. Resetting user IDs and question.");
			nextId = 0;
			question = "";
		}
		else
		{
			send_message_user_left(uid);
		}
	});
	conn.on("error", function(e){
		console.log("User left due to error");
		send_message_user_left(uid);
	});
	
	users.push(newuser);
	
	send_message_init(newuser);
	send_message_new_user(newuser);
});

console.log("Finished setup");
