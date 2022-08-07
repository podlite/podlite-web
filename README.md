# Podlite-web

A minimal, lightweight starter for creating blogs/sites using nexjs and pod6 markup language!

## QUICK GUIDE


### using yarn
```sh
yarn && yarn dev
```
* open link [http://localhost:3000](http://localhost:3000) after

Here is demo page from `pub` directory. 

![Podlite-Web demo page Screenshot](./assets/demopage1.png)
![Podlite-Web demo page Screenshot](./assets/demopage2.png)

You can edit pub/*.pod6 files and see changes after save.

All features  like `=Diagram`, `=Image` , `=Toc` for [Podlite editor](https://github.com/podlite/podlite-desktop) is available for podlite-web too:
![Podlite editor Screenshot](./assets/podlite-editor.png)

### using Docker

* make `index.pod6` with the following content:
```
=begin pod
=TITLE Personal blog

🚧 Web site is under construction. 🚧
=end pod
```
run the command:

```sh
docker run -it --rm -v ${PWD}:/app/pub -p 3000:3000  podlite/podlite-web dev
```

* open link [http://localhost:3000](http://localhost:3000)
* after edit `index.pod6` web page will reload automatically


#### Export to zipped static site
```sh
docker run -it --rm -v ${PWD}:/app/pub podlite/podlite-web export-zip > site.zip
```

#### Advance configuration

* using `https://example.com` as domain name
* customize Time Zone
* change default `index.pod6` path to subdirectory

```sh
docker run -it --rm -v ${PWD}:/app/pub -p 3000:3000 \
-e 'SITE_URL=https://example.com' \
-e 'TZ=Europe/London' \
-e 'INDEX_PATH=minimal/index.pod6' \
podlite/podlite-web export-zip > site.zip
```

## 💻 Develop

### Setup the repo

```sh
yarn
```

### Develop

`yarn dev` will spin up the demosite from `pub` directory and watch changes to the files.

### Export to zip 

```sh
yarn export-zip > file.zip
```

Explore `examples` dir for get more pod6 insights.

thank you!
## License

This project is licensed under the terms of the
[MIT license](/LICENSE).