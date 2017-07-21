import javax.script.ScriptEngine;
import javax.script.ScriptEngineManager;
import java.io.FileReader;
import java.io.File;

public class AsciidoctorConvertWithNashorn {

  public static void main(String... args) throws Throwable {
    ScriptEngineManager engineManager = new ScriptEngineManager();
    ScriptEngine engine = engineManager.getEngineByName("nashorn");
    engine.eval(new FileReader("./spec/nashorn/asciidoctor-convert.js"));
  }
}
