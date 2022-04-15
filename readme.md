# Rem

A service that acts as a search aggregator for several niche Japanese sites.

This service does some smart and some dumb things to access any listings available on the sites. Mostly it uses scraping with x-ray-scraper since these Japanese sites are stuck in the early 2000s and don't redesign or have any public facing APIs.

For the sites that do have APIs (mercari), they restrict it so heavily that it's a pain to figure out how a network call is made but it's done and the code is in node and python in a different repo if needed.

This is really just a collection of scrapers that tend to be stable that I've cobbled together into some semblance of a service because I really just want to track some niche plushes online.

It's completely usable but there's some work on setting it up.

Most extractors (a module that pulls data from a website) will run fine without keys, except for Rakuten since they offer a public WORKING API.

If you launch the service with `SECRET_KEY` environment variable set, all http requests require that to be passed in as an `api-key` header. This was the most security I wanted to add since it's all in a private running bot where the key is only known to me.

In the future, I'd like to spin up some frontend so other people can search for stuff but I'd need a bunch of work for that because of caching and throttling.