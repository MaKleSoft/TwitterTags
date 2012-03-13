<?php
	include "multirequest.php";	
	
	// get params
	$type = isset($_GET["responsetype"]) ? $_GET["responsetype"] : "json";
	// how many search requests to do (100 results per request)
	$n_search = isset($_GET["n_search"]) ? $_GET["n_search"] : 1;
	// how many tags to show (at most)
	$n_tags = isset($_GET["n_tags"]) ? $_GET["n_tags"] : 10;
	// how many suggestions to show (at most)
	$n_sugg = isset($_GET["n_sugg"]) ? $_GET["n_sugg"] : 5;
	// factor for the font-size/padding of the html output
	$size = isset($_GET["size"]) ? $_GET["size"] : 3;
	
	if (isset($_GET["twitterhandle"])) {
		$handle = strtolower($_GET["twitterhandle"]);
	} else {
		if ($type == "json") {
			echo "{'error':'missing parameter: twitterhandle'}";
		} else {
			echo "<div style='color: Red'>Error! missing parameter: twitterhandle</div>";
		}
		exit();
	}
	
	// weights for different tag sources
	$content_weight = 1;
	$url_keywords_weight = 1;
	$url_title_weight = 0;
	$url_description_weight = 1;
	
	// 100 most common words in english; Stolen from http://en.wikipedia.org/wiki/Most_common_words_in_English
	$common_words ="the|be|to|of|and|a|in|that|have|I|it|for|not|on|with|he|as|you|do|at|this|but|his|by|from|they|we|say|her|she|or|an|will|my|one|all|would|there|their|what|so|up|out|if|about|who|get|which|go|me|when|make|can|like|time|no|just|him|know|take|person|into|year|your|good|some|could|them|see|other|than|then|now|look|only|come|its|over|think|also|back|after|use|two|how|our|work|first|well|way|even|new|want|because|any|these|give|day|most|us|am";
	// other common words
	$other_common_words = "is|are|makes";
	// words often used on twitter
	$twitter_words = "via|rt|follow";
	
	$url_shortener = "tinyurl.com|bit.ly|goo.gl|6url.com|budurl.com|canurl.com|cli.gs|decenturl.com|doiop.com|dwarfurl.com|easyurl.net|elfurl.com|fire.to|flq.us|freak.to|is.gd|ix.lt|krunchd.com|memurl.com|miklos.dk|myurl.in|nanoref.com|notlong.com|piurl.com|qicute.com|qurlyq.com|redirx.com|rurl.org|shorl.com|shorterlink.com|shortlinks.co.uk|shorturl.com|shout.to|shrinkurl.us|shurl.net|simurl.com|smarturl.eu|snipurl.com|snurl.com|starturl.com|surl.co.uk|tighturl.com|tinylink.com|traceurl.com|tr.im|twurl.nl|url9.com|urlcut.com|urlhawk.com|urlpass.com|url-press.com|yuarel.com|xaddr.com|xrl.us|yatuc.com|yep.it|yweb.com|j.mp|go.ly|ow.ly|tiny.cc|ht.ly";
	
	$img_hoster = "twitpic.com|pikchur.com|twitgoo.com|yfrog.com|img.ly|tinypic.com|flickr.com";
	
	// get tweets by handle (using twitter search api)
	function get_tweets($handle) {
		global $n_search;
		$requests = array();
		for ($i = 1; $i <= $n_search; $i++) {
			array_push($requests, "http://search.twitter.com/search.json?rpp=100&include_entities=true&q=" . $handle . "&page=" . $i);
		}
		$results = multi_request($requests);
		
		$tweets = array();
		foreach ($results as $result) {
			$data = json_decode($result, true);
			$tweets = array_merge($tweets, $data["results"]);
		}
		return $tweets;
	}
	
	// get meta data from an html document
	function get_meta_data($html){
		/*
		Meta tag pattern from	
		http://regexlib.com/%28A%28uEg8qvE0xP0XjVpGciOaVqFiqKkRTruXtgwtPowcNBSf6oZW8brpQIyl2uWposjGRzXE5cggHtwz2Z9hW8BSjZfxXws_ri0KSQohMmQyHOGYYHM64HL9jstunE2eo5ii9iqyN1_Uv9PzYabs0VkJNothp-KWfwPw5k_87aJSLRzaoL1n9862LyvMrHNTNufS0%29%29/REDetails.aspx?regexp_id=1440
		
		Only matches tags with the attribute order name, content. Maybe find a better one when there is time
		*/
		$meta_tag_pattern = "/<meta[\s]+[^>]*?name[\s]?=[\s\"\']+(.*?)[\s\"\']+content[\s]?=[\s\"\']+(.*?)[\"\']+.*?>/";
		
		// extract meta tags
		preg_match_all($meta_tag_pattern, $html, $match);
		$keys = $match[1];
		$values = $match[2];
		
		$meta = array();
		for ($i=0; $i<count($keys); $i++) {
			$meta[$keys[$i]] = $values[$i];
		}
		
		// extract title
		preg_match("/<title>(.*?)<\/title>/i", $html, $match);
		if (isset($match[1])) {
			$meta["title"] = $match[1];
		}
		
		preg_match('/Location: (https?:\/\/[^\/]+\.[^\/]+(\/[^\\\\n]*)?)\n/', $html, $match);
		// if no redirect header then return the original url
		if (isset($match[1])) {
			$meta["extended_url"] = $match[1];
		}
		
		return $meta;
	}
	
	// get meta data for an array of urls
	function get_meta_data_multi($urls) {
		$options = array(CURLOPT_HEADER => 1, CURLOPT_FOLLOWLOCATION => 1, CURLOPT_MAXREDIRS => 2, CURLOPT_TIMEOUT => 5);
		$pages = multi_request($urls, $options);
		$metadata = array();
		foreach ($pages as $page) {
			array_push($metadata, get_meta_data($page));
		}
		return $metadata;
	}
	
	// increase count of a key in an array (used to measure frequency of words)
	function inc_count($key, $weight, &$array) {
		global $handle;
		$key = strtolower($key);
		if (!$key || strlen($key) < 3 || $key == $handle) return;
		if (isset($array[$key])) {
			$array[$key] += $weight;
		} else {
			$array[$key] = $weight;
		}
	}
	
	// extcract tags from a block of text
	function extract_tags($text) {
		global $common_words, $other_common_words, $twitter_words;
		// remove urls (they are included in the entities anyway)
		$text = preg_replace("/https?:\/\/.+($|\s)/i", "", $text);
		// remove non-word characters
		$text = preg_replace("/[^a-z0-9\s]/i", "", $text);
		// remove common words
		$text = preg_replace("/\b(" . $common_words . "|" . $other_common_words . "|" . $twitter_words . ")\b\s?/i", "", $text);
		// remove searched twitter handle
		//$text = preg_replace("/\b". $handle . "\b\s?/i", "", $text);
		
		$words = preg_split("/\s+/", $text);
		return $words;
	}
	
	$start = time();
	$substart = time();
	$tweets = get_tweets($handle);
	$subend = time();
	//echo "tweets time: " . ($subend - $substart) . "s<br>";
	
	//echo "number of hits: " . count($tweets) . "<br>";
	
	$tag_counts = array();
	$domain_counts = array();
	$url_counts = array();
	
	// extract tags from tweets and collect urls to extract more tags from later
	foreach ($tweets as $tweet) {
		$text = $tweet["text"];
		
		$words = extract_tags($text);
		
		// get tags from tweet content
		foreach ($words as $word) {
			inc_count($word, $content_weight, $tag_counts);
		}
		
		// collect urls from url entities
		if (isset($tweet["entities"]["urls"])) {
			foreach ($tweet["entities"]["urls"] as $urldata) {
				$url = isset($urldata["expanded_url"]) ? $urldata["expanded_url"] : $urldata["url"];
				
				inc_count($url, 1, $url_counts);
			}
		}
		
		// collect urls from media entities
		if (isset($tweet["entities"]["media"])) {
			foreach ($tweet["entities"]["media"] as $urldata) {
				$url = isset($urldata["expanded_url"]) ? $urldata["expanded_url"] : $urldata["url"];
				inc_count($url, 1, $url_counts);
			}
		}
	}
	
	$urls = array_keys($url_counts);
	$substart = time();
	$metadata = get_meta_data_multi($urls);
	$subend = time();
	//echo "meta data time: " . ($subend - $substart) . "s<br>";
	
	// extract tags from meta data of collected urls
	for ($i = 0; $i < count($metadata); $i++) {
		$meta = $metadata[$i];
		$count = $url_counts[$urls[$i]];
		// extract tags from keywords
		if (isset($meta["keywords"])) {
			$words = explode(",", $meta["keywords"]);
			foreach ($words as $word) {
				inc_count($word, $url_keywords_weight * $count, $tag_counts);
			}
		}
		
		// extract tags from description
		if (isset($meta["description"])) {
			$words = extract_tags($meta["description"]);
			foreach ($words as $word) {
				inc_count($word, $url_description_weight * $count, $tag_counts);
			}
		}
		
		// extract tags from title
		if (isset($meta["title"])) {
			$words = extract_tags($meta["title"]);
			foreach ($words as $word) {
				inc_count(strtolower($word), $url_title_weight * $count, $tag_counts);
			}
		}
		
		//add domain to url suggestions. problem: not all urls are expanded so we get a lot of url shortening sites
		$url = isset($meta["extended_url"]) ? $meta["extended_url"] : $urls[$i];
		$domain = preg_replace("/(https?:\/\/[^\/]+\.[^\/]+)(\/.*)?/", "$1", $url);
		if ($domain && !preg_match("/" . $url_shortener . "/i", $domain) && !preg_match("/" . $img_hoster . "/i", $domain)) {
			inc_count($domain, $count, $domain_counts);
		}
	}
	
	$end = time();
	
	//echo "overall time: " . ($end - $start) . "s<br>";
	
	// put together top tags and suggestions
	
	arsort($tag_counts, SORT_NUMERIC);
	$tags = array();
	$overall_count = 0;
	$keys = array_keys($tag_counts);
	for ($i=0; $i<min($n_tags, count($keys)); $i++) {
		array_push($tags, array("tag" => $keys[$i], "weight" => $tag_counts[$keys[$i]]));
		$overall_count += $tag_counts[$keys[$i]];
	}
	
	foreach ($tags as &$tag) {
		$tag["weight"] = round($tag["weight"]/$overall_count * 100);
	}
	
	arsort($domain_counts, SORT_NUMERIC);
	$link_suggestions = array();
	$keys = array_keys($domain_counts);
	for ($i=0; $i<min($n_sugg, count($keys)); $i++) {
		array_push($link_suggestions, $keys[$i]);
	}
	
	// output result
	$result = array("twitterhandle" => $handle, "tags" => $tags, "suggestions" => $link_suggestions);
	if ($type == "json") {
		echo json_encode($result);
	} elseif ($type == "html") {
		echo "<div>";
		$stags = $result["tags"];
		shuffle($stags);
		foreach ($stags as $tag) {
			echo "<span style='font-size: " . ($tag["weight"] * $size) . "pt; padding: " . ($tag["weight"] * $size) . "px'>" . $tag["tag"] . "</span> ";
		}
		echo "</div>";
	}
?>