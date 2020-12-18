# cr

`cr` is a small [single-page application](https://en.wikipedia.org/wiki/Single-page_application) for
rendering "change requests" (also known as "webrevs"). `cr` can render patch
data stored as JSON to display a change in various ways, for example as a
"cdiff", "udiff" and "sdiff".

The data used by `cr` is stored in the [webrevs](https://git.openjdk.java.net/webrevs) repository.

## Developing

For making changes to `cr`, just clone this repository, edit `webrev.js` and
then serve `index.html` locally (for example using `python -m http.server`).

## Wiki

`cr` uses project Skara's wiki which is available at <https://wiki.openjdk.java.net/display/skara>.

## Issues

Issues are tracked in the [JDK Bug System](https://bugs.openjdk.java.net/)
under project Skara at <https://bugs.openjdk.java.net/projects/SKARA/>.

## Contributing

We are more than happy to accept contributions to `cr`, both via
patches sent to the Skara
[mailing list](https://mail.openjdk.java.net/mailman/listinfo/skara-dev) and in the
form of pull requests on [GitHub](https://github.com/openjdk/cr/pulls/).

## Members

See <http://openjdk.java.net/census#skara> for the current Skara
[Reviewers](https://openjdk.java.net/bylaws#reviewer),
[Committers](https://openjdk.java.net/bylaws#committer) and
[Authors](https://openjdk.java.net/bylaws#author). See
<https://openjdk.java.net/projects/> for how to become an author, committer
or reviewer in an OpenJDK project.

## Discuss

Development discussions take place on the project Skara mailing list
`skara-dev@openjdk.java.net`, see
<https://mail.openjdk.java.net/mailman/listinfo/skara-dev> for instructions
on how to subscribe of if you want to read the archives. You can also reach
many project Skara developers in the `#openjdk` IRC channel on
[OFTC](https://www.oftc.net/), see <https://openjdk.java.net/irc/> for details.

## License

See the file `LICENSE` for details.
