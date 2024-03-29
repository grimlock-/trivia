var initing = true;
var loading_tid;
var current_theme;
var name_display_tid = 0;
var themes = ["butter", "portrait", "shore", "orange-coral", "kye-meh", "lemon-twist"];

//{ Listeners
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
function _spacebarUp(e)
{
	if(e.code == "Space")
		request_lock();
}
function _drop(e)
{
	e.preventDefault();

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
//}

function init_ui(args)
{
	loading_tid = setInterval(loading_ticker, 500);
	set_theme(args.theme);
	document.getElementById("theme_button").addEventListener("click", next_theme);
	document.getElementById("scores_back").addEventListener("click", function(e) {
		if(!document.getElementById("scores_screen").classList.contains("hidden"))
		{
			hide_screen("all");
			show_screen("main");
		}
	});
	if(args.testing)
	{
		hide_screen("connecting");
		show_screen("main");
	}
	let buzzer = document.getElementById("buzzer");
	if(buzzer)
	{
		buzzer.addEventListener("mousedown", _buttonDown);
		buzzer.addEventListener("mouseup", _buttonUp);
	}
	initing = false;
}

function hide_screen(screen)
{
	let ele;
	switch(screen)
	{
		case "connecting":
			ele = document.getElementById("connection_screen");
			if(loading_tid)
			{
				clearInterval(loading_tid);
				loading_tid = 0;
			}
		break;
		case "no_connection":
			ele = document.getElementById("no_connection_screen");
		break;
		case "enter_name":
			ele = document.getElementById("name_screen");
		break;
		case "main":
			ele = document.getElementById("main_screen");
			document.body.removeEventListener("keyup", _spacebarUp);
			document.getElementById("main_screen").removeEventListener("drop", _drop);
		break;
		case "scores":
			ele = document.getElementById("scores_screen");
		break;
		case "all":
			for(let e of document.querySelectorAll(".screen"))
			{
				e.classList.add("hidden");
			}
			document.body.removeEventListener("keyup", _spacebarUp);
			document.getElementById("main_screen").removeEventListener("drop", _drop);
			return;
		break;
		default:
			return;
	}
	ele.classList.add("hidden");
}

function show_screen(screen)
{
	let ele;
	switch(screen)
	{
		case "connecting":
			ele = document.getElementById("connection_screen");
		break;
		case "no_connection":
			ele = document.getElementById("no_connection_screen");
		break;
		case "enter_name":
			ele = document.getElementById("name_screen");
		break;
		case "main":
			ele = document.getElementById("main_screen");
			document.body.addEventListener("keyup", _spacebarUp);
			document.getElementById("main_screen").addEventListener("drop", _drop);
		break;
		case "scores":
			ele = document.getElementById("scores_screen");
		break;
		default:
			return;
	}
	ele.classList.remove("hidden");
}

function loading_ticker()
{
	let ele = document.getElementById("connection_screen").querySelector("h6");
	switch(count_char(ele.innerHTML, '.'))
	{
		case 1:
			ele.innerHTML = "Connecting to server..";
		break;
		case 2:
			ele.innerHTML = "Connecting to server...";
		break;
		default:
			ele.innerHTML = "Connecting to server.";
		break;
	}
}

function set_theme(theme_name)
{
	let ele = document.body;
	if(ele.classList.length)
		ele.classList.replace("background-"+current_theme, "background-"+theme_name)
	else
		ele.classList.add("background-"+theme_name);
	ele = document.querySelector("#theme_button .theme_icon");
	if(ele.classList.length > 1)
		ele.classList.replace(current_theme, theme_name);
	else
		ele.classList.add(theme_name);

	current_theme = theme_name;
	if(typeof i_am_admin != "undefined")
		localStorage.setItem("admin_theme", theme_name)
	else
		localStorage.setItem("theme", theme_name)

	if(!initing)
	{
		ele = document.getElementById("theme_name");
		ele.innerText = theme_name;
		ele.classList.remove("hidden");
		if(name_display_tid)
			clearTimeout(name_display_tid);
		name_display_tid = setTimeout(theme_name_timeout, 3000);
	}

	console.log("Theme set to " + theme_name);
}

function next_theme()
{
	let i = themes.indexOf(current_theme);
	let ii = ++i % themes.length;
	set_theme(themes[ii]);
}

function theme_name_timeout()
{
	document.getElementById("theme_name").classList.add("hidden");
	name_display_tid = 0;
}
