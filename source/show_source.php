<?php
	$tabSize = isset($_GET['tabsize']) ? 1*$_GET['tabsize'] : 8;
	$file    = isset($_GET['file']) ? $_GET['file'] : '';
	$clean   = preg_replace('/[^a-zA-Z0-9_\-\.\:\#]/', '', $file);
	if ($clean !== $file) {
		http_response_code(400);
		die('Illegal characters in ?file= - only use a-z, A-Z, 0-9 or _-.:');
	}
?>
<!DOCTYPE html><head lang="en"><title>Source view of <?= $file ?></title><meta charset="utf-8"><style>

	:root {
		       --page-bg : #fff;      --code-color : #000;    --numbers-color : #999; --filename-bgcolor : #ccc;
		--line-bgcolor-0 : #fff0; --line-bgcolor-1 : #f4f4f4; --line-selected : #bed; --line-selected-bg : #ddd;
		      --syntax-1 : #08f;        --syntax-2 : #a0f;         --syntax-3 : #368;    --syntax-strong : #fc0;
		    --number-gap : 0.15em;   --line-height : 1.325em;
	}
@media (prefers-color-scheme: dark) {
	:root:not(.lightMode) {
		       --page-bg : #000;      --code-color : #ddd;    --numbers-color : #aaa; --filename-bgcolor : #333;
		--line-bgcolor-0 : #fff0; --line-bgcolor-1 : #101010; --line-selected : #036; --line-selected-bg : #333;
		      --syntax-1 : #8df;        --syntax-2 : #aee;         --syntax-3 : #9aa;    --syntax-strong : #fc0;
		    --number-gap : 0.15em;   --line-height : 1.325em;
	}
	/* 1=keyword 2=Brackets 3=comment //...var(--filename-bgcolor);-->dimgrey */
}
	* {
		margin:0; padding:0; box-sizing:border-box; white-space:nowrap;
		font-family:monospace,monospace; font-size:13px; color:var(--code-color); tab-size:<?= $tabSize ?>em;
	}
	:focus { outline:none; background:var(--line-selected-bg); }
	:target { background-color:var(--line-selected); scroll-margin:calc(50vh - 0.5em); }
	body { Xwidth:max-content;Xmargin:0 auto; background:var(--page-bg); }
	header, footer { position:relative; z-index:2; padding:0.25em; background:var(--filename-bgcolor); user-select:none; }
	header::before {
		content:'123456789.123456789.123456789.123456789.123456789.123456789.123456789.123456789.123456789.123456789.123456789.1234119:/.';
		position:fixed; z-index:1; top:0; height:100%; padding-left:calc(0 * var(--number-gap) + 4em + 1px); Xpadding-left:4em;
		border:solid var(--filename-bgcolor); border-width:0 1px 0 0;
		pointer-events:none; color:transparent;
	}
	ol {
		--c0:var(--line-bgcolor-0); --c1:var(--line-bgcolor-1); Xpadding:0 0.25em/*adjust width limit line*/;
		white-space:normal; overflow:auto; line-height:var(--line-height);
		background:var(--page-bg) linear-gradient(to bottom,var(--c0) 0%,var(--c0) 50%,var(--c1) 50%,var(--c1) 100%);
		background-repeat:repeat; background-position:0 0; background-size:1em calc(var(--line-height) * 2);
		position:relative;
	}
	li { display:block; Xpadding-right:0.5em; Xwidth:100%; }
	li:not(:has(h1))::before {
		content: attr(id); display:inline-block; white-space:pre; color:var(--numbers-color);
		width:4em; text-align:right; padding-right:var(--number-gap); margin-right:var(--number-gap);
		border:solid 1px var(--filename-bgcolor); border-width:0 1px 0 0;
	}
	a, u,b,i { white-space:pre; display:inline-block; text-decoration:none; font-style:normal; }
	a:hover, a:hover * { text-decoration:underline; color:var(--code-color); }
	u { color:var(--syntax-1); }  b { color:var(--syntax-2); Xfont-weight:normal; }  i, i * { color:var(--syntax-3); }
	strong { color:var(--syntax-strong); }

</style></head><body><menu style="display:none !important">

	<button accesskey="l" onclick="document.documentElement.classList.toggle('lightMode')"></button>

</menu><header><h1>Source View of <a href="#"><?php // show_source.php

	$filePath = __DIR__ . '/' . $clean;
	if (file_exists($filePath) && is_file($filePath)) {
		$sourceCode = file_get_contents($filePath);
		$fileName = basename($filePath);

		//
		// Output some markup:
		//
		echo $fileName . "</header></a></h1><ol>\n";

		//
		// Create <li> for each line of source text
		//
		$lines = explode("\n", $sourceCode);

		foreach ($lines as $lineNumber => $lineText) {
			// Transform into printable text
			$tab  = str_repeat(' ', $tabSize);

			$text = nl2br(htmlspecialchars($lineText));

			$text = str_replace('<br />', '', $text);
			$text = str_replace("\n", '', $text);
			$text = str_replace("\r", '', $text);
			$text = str_replace("\t", $tab, $text);

			$chars = str_split("(){}[].,:=!?");   // Cant's use < or > or ; (?) beacuse we add html:
			foreach($chars as $c) $text = str_replace($c, "<b>$c</b>", $text);

			$tags = [
				'function', 'const ', 'let ',
				"\nvar ", "\t var ", " var ",
				'if ', 'else ', 'switch ', 'case ', 'with ',
				'class', 'class', 'constructor', 'this',
				'import', 'export', 'for ', 'while ', 'do ', 'until ',
			];
			foreach($tags as $t) {
				$text = str_replace($t, "<u>$t</u>", $text);
			}

			$pos = strpos($text, '//');
			if ($pos !== false) {
				$t0 = substr($text, 0, $pos);
				$t1 = substr($text, $pos);
				$text = "$t0<i>$t1</i>";
			}

			$n = $lineNumber + 1;
			$text = "<li id=\"${n}\"><a href=\"#${n}\">${text}</a></li>\n";

			echo $text;
		}
	} else {
		echo "<strong>File not found</strong>: $clean";
	}

?>
</ol><footer>Light mode on: [L] - All programs end, but not all of them halt.</footer></body></html>
