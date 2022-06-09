"use strict";
const ws = require("ws");

//Globals
let nextId = 0;
let users = [];
let answering = null;
let category = "Category";


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
function blast_message_answer_lock(id)
{
	let message = JSON.stringify({
		blah: "lock",
		id: id
	});
	blast_message(message);
}
function blast_message_release_lock()
{
	let message = JSON.stringify({
		blah: "release"
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
function blast_message_set_answer(answer)
{
	let message = JSON.stringify({
		blah: "setanswer",
		answer: answer
	});
	blast_message(message);
}
function blast_message_set_category(category)
{
	let message = JSON.stringify({
		blah: "setcategory",
		category: category
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
//}
//{ Targeted messages
function send_message_init(user)
{
	let message = {
		blah: "init",
		category: category,
		users: [],
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
			image: u.image
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
function send_message_answer_lock(userConn)
{
	if(answering === null)
		return;
	let message = JSON.stringify({
		blah: "lock",
		id: answering
	});
	userConn.send(message);
}
//}

const server = new ws.Server({host: "localhost", port: 8080});
server.on("connection", function(conn){
	let uid = ++nextId;
	let newuser = {
		id: uid,
		name: "User"+uid,
		isAdmin: false,
		image: "default",
		conn: conn
	};

	console.log("User " + uid + " joined");
	
	conn.on("message", function(msg){
		let message = JSON.parse(msg);
		switch(message.action)
		{
			case "promote":
				for(let u of users)
				{
					if(u.isAdmin)
						return;
				}
				if(answering == uid)
					return;
				newuser.isAdmin = true;
				console.log("Promoted " + newuser.name);
				blast_message_new_admin(uid);
			break;
			
			case "demote":
				if(newuser.isAdmin)
				{
					newuser.isAdmin = false;
					console.log("Demoted " + newuser.name);
					blast_message_no_admin();
				}
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
			
			case "setquestion":
				if(newuser.isAdmin)
				{
					console.log("Question set to " + message.question + ". Giving lock to admin");
					answering = uid;
					blast_message_set_question(message.question);
				}
			break;
			
			case "setcategory":
				if(newuser.isAdmin)
				{
					category = message.category;
					blast_message_set_category(message.category);
				}
			break;
			
			case "setanswer":
				if(newuser.isAdmin)
				{
					blast_message_set_answer(message.answer);
				}
			break;
			
			case "lock":
				console.log(newuser.name + " requested lock. Currently held by: "+answering);
				if(answering === null && !newuser.isAdmin)
				{
					console.log("Giving lock to " + newuser.name);
					answering = uid;
					blast_message_answer_lock(uid);
				}
				else
				{
					if(newuser.isAdmin)
						console.log(newuser.name + " is admin, no lock for them");
					let a = null;
					for(let u of users)
					{
						if(u.isAdmin)
						{
							a = u;
							break;
						}
					}
					if(a && answering != a.id)
						send_message_answer_lock(conn);
					//blast_message_user_buzz(id);
				}
			break;
			
			case "release":
				if(newuser.isAdmin)
				{
					console.log("Admin released lock");
					answering = null;
					blast_message_release_lock();
				}
			break;
		}
	});
	conn.on("close", function(e){
		console.log("User " + uid + " (" + newuser.name + ") left");
		if(answering == uid)
		{
			console.log("Releasing lock");
			answering = null;
		}
		for(let i = 0; i < users.length; ++i)
		{
			if(users[i].id == uid)
				users.splice(i, 1);
		}
		if(users.length == 0)
		{
			console.log("All users have left. Resetting user IDs.");
			nextId = 0;
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
