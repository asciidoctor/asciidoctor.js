import org.graalvm.polyglot.*;

import java.io.IOException;
import java.net.URISyntaxException;
import java.net.URL;
import java.nio.file.Files;
import java.nio.file.Paths;
import java.util.List;

public class AsciidoctorConvertWithGraalVM {
  public static void main(String[] args) {
    Context context = Context.newBuilder("js")
      .allowIO(true)
      .allowAllAccess(true)
      .allowPolyglotAccess(PolyglotAccess.ALL)
      .build();
    context.getPolyglotBindings().putMember("IncludeResolver", new IncludeResolver());
    context.eval("js", "var IncludeResolver = Polyglot.import('IncludeResolver');");
    context.eval("js", "load('./spec/graalvm/asciidoctor-convert.mjs')");
  }

  public static class IncludeResolver {
    public String read(String path) throws IOException, URISyntaxException {
      URL url = this.getClass().getClassLoader().getResource(path);
      if (url != null) {
        List<String> lines = Files.readAllLines(Paths.get(url.toURI()), java.nio.charset.StandardCharsets.UTF_8);
        return String.join("\n", lines);
      } else {
        List<String> lines = Files.readAllLines(Paths.get(path), java.nio.charset.StandardCharsets.UTF_8);
        return String.join("\n", lines);
      }
    }

    public String pwd() {
      return Paths.get("").toAbsolutePath().toString();
    }
  }
}
