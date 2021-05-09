import org.graalvm.polyglot.Context;

import java.io.File;
import java.io.IOException;
import java.net.URISyntaxException;
import java.net.URL;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.util.ArrayList;
import java.util.List;

public class AsciidoctorGraalVM {

  public static void main(String... args) {
    Context context = Context.newBuilder("js")
                                .allowIO(true)
                                .allowAllAccess(true)
                                .allowPolyglotAccess(PolyglotAccess.ALL)
                                .build();
    context.getPolyglotBindings().putMember("IncludeResolver", new IncludeResolver()); // <1>
    context.eval("js", "var IncludeResolver = Polyglot.import('IncludeResolver');");
    ClassLoader classLoader = AsciidoctorGraalVM.class.getClassLoader();
    context.eval("js", "load('" + classLoader.getResource("asciidoctor.js") + "')"); // <2>
    context.eval("js", "load('" + classLoader.getResource("app.js") +"')"); // <2>
  }

  public static class IncludeResolver {
    public String read(String path) throws IOException, URISyntaxException {
      Path filePath = Paths.get(path);
      List<String> lines;
      File file = filePath.toFile();
      if (file.exists()) {
        lines = Files.readAllLines(filePath, StandardCharsets.UTF_8);
      } else {
        Path fileName = filePath.getFileName();
        URL url = this.getClass().getClassLoader().getResource(fileName.toString());
        if (url != null) {
          lines = Files.readAllLines(Paths.get(url.toURI()), StandardCharsets.UTF_8);
        } else {
          lines = new ArrayList<>();
        }
      }
      return String.join("\n", lines);
    }

    public String pwd() {
      return Paths.get("").toAbsolutePath().toString();
    }
  }
}
