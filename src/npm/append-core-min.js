      if (loadExtensions)
        require('./asciidoctor-extensions.min.js')(Opal);

      return Opal.Asciidoctor;
    }
  }
}
