var conn;
var users = [];
var answer_queue = [];
var me;
var answering = null;
var port = location.port ? ":" + location.port : "";
var protocol = location.protocol == "https:" ? "wss:" : "ws:";


function get_query_parameters()
{
	let ret = {};
	let str = location.search.substring(1);
	let params = str.split('&');
	for(let param of params)
	{
		let parts = param.split('=');
		let val = parts[1];
		switch(parts[0])
		{
			
			case "testing":
				ret.testing = true;
			break;

			case "users":
				ret.fake_users = Number(val);
			break;

			default:
				ret[parts[0]] = val;
			break;
		}
	}
	return ret;
}


function User(values)
{
	this.id = values.id;
	this.name = values.name || "user";
	this.isAdmin = values.isAdmin || false;
	this.image = values.image || "default";
}
function get_user(id)
{
	for(let u of users)
	{
		if(u.id == id)
			return u;
	}
	return null;
}
function get_admin()
{
	for(let u of users)
	{
		if(u.isAdmin)
			return u;
	}
	return null;
}
function add_user(u, _self)
{
	users.push(u);
	var d = document.createElement("div");
	d.classList.add("user");
	if (_self)
		d.classList.add("self");
	if(u.isAdmin)
		d.classList.add("admin");
	d.dataset.id = u.id;
	if(!u.image || u.image == "default")
		d.innerHTML = "<div class='username'>" + u.name + "</div><img class='usericon' src='white.jpg' width='110' height='110' />";
	else
		d.innerHTML = "<div class='username'>" + u.name + "</div><img class='usericon' src='" + u.image + "' width='110' height='110' />";
	if (_self) {
		d.querySelector("img").addEventListener("click", function () {
			if (me.isAdmin) request_demote();
			else request_promote();
		});
		d.querySelector(".username").addEventListener("click", function(e){
			let n = prompt("Enter your new name");
			if(n)
			{
				n = n.trim();
				if(n) request_name_change(n);
			}
		});
	}
	document.getElementById("userlist").appendChild(d);
}
function add_user_admin(u)
{
	users.push(u);
	let d = document.createElement("div");
	d.classList.add("user");
	d.dataset.id = u.id;
	if(!u.image || u.image == "default")
		d.innerHTML = "<img class='usericon' src='white.jpg' width='60' height='60' /><div class='username'>" + u.name + "</div>";
	else
		d.innerHTML = "<img class='usericon' src='" + u.image + "' width='60' height='60' /><div class='username'>" + u.name + "</div>";
	document.getElementById("userlist").appendChild(d);
}
function remove_user(id)
{
	let u;
	for (let i = 0; i < users.length; ++i) {
		if (users[i].id === id)
			u = users.splice(i, 1);
	}
	for (let ele of document.getElementsByClassName("user")) {
		if (ele.dataset.id && ele.dataset.id == id) {
			ele.parentNode.removeChild(ele);
		}
	}
	if(answering == id)
		release_lock();
}
function draw_answer_queue()
{
	/*for(let id of answer_queue)
	{
		let u = get_user(id);
	}*/
}


function ws_message(e)
{
	//var messages = JSON.parse(e.data);
	//if(!Array.isArray(messages))
	var msg = JSON.parse(e.data);
	if(!msg.blah)
		return;

	/*for(let msg of messages)
	{*/
		switch(msg.blah)
		{
			case "init":
				//handle data
				me = new User(msg.you);
				//global var
				if(typeof i_am_admin != "undefined")
				{
					for (let u of msg.users) {
						add_user_admin(new User(u), false);
					}
					request_promote();
					//saved name
					let savedName = localStorage.getItem("name");
					if (savedName)
						document.getElementById("name_input").placeholder = savedName;
					//saved image
					let savedImage = localStorage.getItem("image");
					if(savedImage)
						request_image_change(savedImage);
					//screen transition
					document.getElementById("connection_screen").classList.add("hidden");
					document.getElementById("main_screen").classList.remove("hidden");
				}
				else
				{
					add_user(me, true);
					for (let u of msg.users) {
						add_user(new User(u), false);
					}
					//saved name
					let savedName = localStorage.getItem("name");
					if (savedName)
						document.getElementById("name_input").placeholder = savedName;
					else
						document.getElementById("name_input").placeholder = me.name;
					document.body.addEventListener("keyup", _enterNameKeyup);
					document.getElementById("name_input").addEventListener("keyup", _enterNameKeyup);
					//saved image
					let savedImage = localStorage.getItem("image");
					if(savedImage)
						request_image_change(savedImage);
					//screen transition
					document.getElementById("connection_screen").classList.add("hidden");
					document.getElementById("name_screen").classList.remove("hidden");
				}
			break;

			case "newuser":
				if(typeof i_am_admin != "undefined")
					add_user_admin(new User(msg.user), false);
				else
					add_user(new User(msg.user), false);
			break;

			case "newadmin":
				if(typeof i_am_admin != "undefined")
					return;
				let u = get_user(msg.id);
				u.isAdmin = true;
				for (let ele of document.getElementsByClassName("user")) {
					if (ele.dataset.id == u.id) {
						ele.classList.add("admin");
						break;
					}
				}
				if (msg.id == me.id) {
					/*document.getElementById("spotlight_avatar").removeEventListener("mousedown", _spotlightDown);
					document.getElementById("spotlight_avatar").removeEventListener("mouseup", _spotlightUp);
					document.getElementById("spotlight_avatar").removeEventListener("mouseleave", _spotlightUp);*/
					document.getElementById("spotlight_avatar").addEventListener("click", admin_release_lock);
					document.getElementById("letter_q").addEventListener("click", function(e){
						let newq = prompt("Enter the new question");
						console.log(newq.trim());
						if(newq.trim().length > 0)
							request_set_question(newq.trim());
					});
					//Create question input
					/*let new_ele = document.createElement("input");
					new_ele.className = "spec";
					new_ele.type = "text";
					new_ele.id = "question_input";
					new_ele.placeholder = "Question input";
					new_ele.addEventListener("focus", start_question_input);
					document.getElementById("qin_container").insertAdjacentElement("afterbegin", new_ele);
					//Question submit image
					new_ele = document.createElement("img");
					new_ele.id = "question_submit";
					new_ele.src = "arrow.svg";
					new_ele.width = new_ele.height = 24;
					new_ele.addEventListener("click", request_set_question);
					document.getElementById("question_input").insertAdjacentElement("afterend", new_ele);
					//Create answer input
					new_ele = document.createElement("input");
					new_ele.className = "spec";
					new_ele.type = "text";
					new_ele.id = "answer_input";
					new_ele.placeholder = "Answer input";
					new_ele.addEventListener("focus", start_question_input);
					document.getElementById("ain_container").insertAdjacentElement("afterbegin", new_ele);
					//Answer submit image
					new_ele = document.createElement("img");
					new_ele.id = "answer_submit";
					new_ele.src = "arrow.svg";
					new_ele.width = new_ele.height = 24;
					new_ele.addEventListener("click", request_show_answer);
					document.getElementById("answer_input").insertAdjacentElement("afterend", new_ele);*/
				}
			break;

			case "noadmin":
				if (me.isAdmin) {
					me.isAdmin = false;
					//document.getElementById("category").removeEventListener("click", start_editing_category);
					document.getElementById("spotlight_avatar").removeEventListener("click", admin_release_lock);
					/*else
					{
						document.getElementById("spotlight_avatar").addEventListener("mousedown", _spotlightDown);
						document.getElementById("spotlight_avatar").addEventListener("mouseup", _spotlightUp);
						document.getElementById("spotlight_avatar").addEventListener("mouseleave", _spotlightUp);
					}*/

					/*let ele = document.getElementById("question_input");
					ele.parentNode.removeChild(ele);
					ele = document.getElementById("answer_input");
					ele.parentNode.removeChild(ele);
					ele = document.getElementById("question_submit");
					ele.parentNode.removeChild(ele);
					ele = document.getElementById("answer_submit");
					ele.parentNode.removeChild(ele);*/
				} else {
					for (let u of users) {
						u.isAdmin = false;
					}
				}
				for (let ele of document.getElementsByClassName("admin")) {
					ele.classList.remove("admin");
				}
			break;

			case "namechange":
				console.log("name change: " + msg.id + ": " + msg.name);
				if (msg.id == me.id)
					change_own_name(msg.name);
				else
					change_name(msg.id, msg.name);
				break;

			case "lock":
				user_got_lock(msg.id);
				break;

			case "release":
				release_lock();
				break;

			case "userleave":
				remove_user(msg.id);
				break;

			case "setquestion":
				set_question(msg.question);
				if(answering != null)
					release_lock();
				user_got_lock(get_admin().id);
				break;

			case "setimage":
				set_image(msg.id, msg.dataUrl);
				break;

			/*case "buzz":
				user_buzz(msg.id);
				break;*/

			default:
				console.log("Unknown message: " + msg.blah);
				break;
		}
	//}
}
function change_name(id, name)
{
	get_user(id).name = name;
	for (let u of document.getElementsByClassName("user")) {
		if (u.dataset.id && u.dataset.id == id) {
			u.querySelector(".username").innerHTML = name;
			break;
		}
	}
}
function change_own_name(name)
{
	localStorage.setItem("name", name);
	me.name = name;
	document.getElementsByClassName("user")[0].querySelector(".username").innerHTML = name;
}
function user_got_lock(id)
{
	answering = id;
	let u = get_user(id);
	if(u.image == "default")
		document.getElementById("spotlight_avatar").src = "usericon.png";
	else
		document.getElementById("spotlight_avatar").src = u.image;
	document.getElementById("spotlight_name").innerHTML = u.name;
	if(me.isAdmin)
	{
		document.getElementById("spotlight_avatar").addEventListener("click", admin_release_lock);
	}
	/*document.getElementById("spotlight_avatar").removeEventListener("mousedown", _spotlightDown);
	document.getElementById("spotlight_avatar").removeEventListener("mouseup", _spotlightUp);
	document.getElementById("spotlight_avatar").removeEventListener("mouseleave", _spotlightUp);*/
}
function admin_release_lock()
{
	request_release();
}
function release_lock()
{
	answering = null;

	//document.getElementById("question").classList.remove("locked");
	let avt = document.getElementById("spotlight_avatar");
	avt.src = "white.jpg";
	document.getElementById("spotlight_name").innerHTML = "";
	/*avt.addEventListener("mousedown", _spotlightDown);
	avt.addEventListener("mouseup", _spotlightUp);
	avt.addEventListener("mouseleave", _spotlightUp);*/
	document.getElementById("spotlight_name").innerHTML = "";
}
function set_question(question)
{
	let ele = document.getElementById("question");
	if (ele.classList.contains("hidden")) {
		ele.innerHTML = question;
		ele.classList.remove("hidden");
		ele.classList.add("locked");
	} else {
		ele.classList.add("hidden");
		setTimeout(function () { ele.querySelector("#question_text").innerHTML = question; ele.classList.remove("hidden"); ele.classList.add("locked");}, 1500);
	}
	/*let ele2 = document.getElementById("answer");
	if(!ele2.classList.contains("hidden"))
		ele2.classList.add("hidden");*/
}
function set_image(id, dataUrl)
{
	if(id == me.id)
	{
		me.image = dataUrl;
		localStorage.setItem("image", dataUrl);
	}
	else
	{
		get_user(id).image = dataUrl;
	}

	for(let ele of document.getElementsByClassName("user"))
	{
		if(ele.dataset.id != id)
			continue;
		if(dataUrl == "default")
			ele.querySelector("img").src = "white.jpg";
		else
			ele.querySelector("img").src = dataUrl;
		break;
	}
}


/*function start_editing_name()
{
	this.innerHTML = "<input type='text' id='name_edit' />";
	this.firstChild.value = me.name;
	this.removeEventListener("click", start_editing_name);
	this.addEventListener("focusout", finish_editing_name)
	document.body.removeEventListener("keyup", spacebar_listener);
}
function finish_editing_name()
{
	let newname = this.firstChild.value;
	this.removeEventListener("focusout", finish_editing_name);
	this.innerHTML = me.name;
	this.addEventListener("click", start_editing_name);
	document.body.addEventListener("keyup", spacebar_listener);
	request_name_change(newname);
}*/
function spacebar_listener(e)
{
	if(e.code == "Space")
		request_lock();
}
function drop_listener(e)
{
	e.preventDefault();
	console.log("got file drop");

	if(!e.dataTransfer)
	{
		console.error("No dataTransfer property! Cannot parse image");
		return;
	}
	if (e.dataTransfer.items)
	{
		//DataTransferItemList interface
		for (let itm of e.dataTransfer.items)
		{
			if(itm.kind !== 'file')
				continue;

			var file = itm.getAsFile();
			if(!file.type.startsWith("image/"))
				continue;

			let reader = new FileReader();
			reader.onload = function(e) {
				//me.image = e.target.result;
				request_image_change(e.target.result);
			};
			reader.readAsDataURL(file);
		}
	}
}




/*
 * WebSocket requests
 */
function request_name_change(newname)
{
	conn.send(JSON.stringify({action: "setname", name: newname}));
}
function request_image_change(dataUrl)
{
	conn.send(JSON.stringify({action: "setimage", image: dataUrl}));
}
function request_lock()
{
	if(answering != me.id && !me.isAdmin)
		conn.send(JSON.stringify({action: "lock"}));
}
function request_release()
{
	conn.send(JSON.stringify({ action: "release" }));
}
function request_user_images()
{
	conn.send(JSON.stringify({action: "getimages"}));
}
function request_promote()
{
	conn.send(JSON.stringify({action: "promote"}));
}
function request_demote()
{
	conn.send(JSON.stringify({action: "demote"}));
}
function request_set_question(question)
{
	conn.send(JSON.stringify({ action: "setquestion", question: question }));
}
function request_clear_queue()
{
	conn.send(JSON.stringify({ action: "clearqueue" }));
}
/*
 * END WebSocket requests
 */



function _buttonDown(e) {
	//this.classList.add("pressed");
	let ele = document.getElementById("buzzer");
	if(ele)
		ele.src = "button1_pressed.png";
	document.getElementById("letter_q").src = "q_pressed.png";
	if(conn && conn.readyState == 1)
		request_lock();
}
function _buttonUp(e) {
	//this.classList.remove("pressed");
	let ele = document.getElementById("buzzer");
	if(ele)
		ele.src = "button1.png";
	document.getElementById("letter_q").src = "q.png";
}
function _enterNameKeyup(e) {
	if(e.code != "Enter" || typeof i_am_admin != "undefined")
		return;
	document.getElementById("name_input").removeEventListener("keyup", _enterNameKeyup);
	document.body.removeEventListener("keyup", _enterNameKeyup);
	let name = document.getElementById("name_input").value;
	if(name == "")
		name = document.getElementById("name_input").placeholder;
	if(me.name != name)
		request_name_change(name);
	hide_screen("enter_name");
	show_screen("main");
	document.body.addEventListener("keyup", spacebar_listener);
	document.getElementById("main_screen").addEventListener("drop", drop_listener);

}
/*document.addEventListener("pagehide", function (e) {
	if (conn)
		conn.close();
});*/
function count_char(string, target)
{
	let count = 0;
	for(let character of string)
	{
		if(character == target)
			++count;
	}
	return count;
}

document.addEventListener("DOMContentLoaded", function(e){
	document.body.addEventListener("dragover", function(e){
		e.preventDefault();
	});

	document.getElementById("name_input").value = "";
	let savedName = localStorage.getItem("name");
	if(savedName)
		document.getElementById("name_input").placeholder = savedName;

	let testing = false;
	let fake_users;
	let params = {};
	if(location.search)
		params = get_query_parameters();

	if(params.testing)
	{
		//fake users
		if(!params.fake_users)
		{
			params.fake_users = Number(prompt("Number of user icons"));
			if(Number.isNaN(params.fake_users))
				params.fake_users = 9;
		}
		for(var i = 1; i <= params.fake_users; ++i)
		{
			let blah = new User({
				id: i,
				name: "User"+i,
				isAdmin: false
			});
			if (i == 1) {
				me = blah;
				me.isAdmin = false;
				if(typeof i_am_admin == "undefined")
					add_user(blah, true);
			}
			else {
				if(typeof i_am_admin != "undefined")
					add_user_admin(blah);
				else
					add_user(blah, false);
			}
		}
		if(typeof i_am_admin != "undefined")
		{
			answer_queue = [1,2,3,4];

		}
	}
	else
	{
		//setup websocket
		conn = new WebSocket(protocol + "//" + location.hostname + port + "/ws");
		conn.addEventListener("open", function(e){
			hide_screen("connecting");
			if(typeof i_am_admin == "undefined")
				show_screen("enter_name");
		});
		conn.addEventListener("message", ws_message);
		conn.addEventListener("close", function(e){
			hide_screen("all");
			show_screen("no_connection");
		});
	}

	if(typeof i_am_admin != "undefined")
	{
		//document.getElementById("clear_queue").addEventListener("click", request_clear_queue);
	}
	else
	{
		document.getElementById("buzzer").addEventListener("mousedown", _buttonDown);
		document.getElementById("buzzer").addEventListener("mouseup", _buttonUp);
		document.getElementById("buzzer").addEventListener("mouseleave", _buttonUp);
	}

	let args = {
		"testing": params.testing,
		"theme": localStorage.getItem("theme") || "butter"
	}
	init_ui(args);
});
