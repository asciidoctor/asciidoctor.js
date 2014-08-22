      require('./asciidoctor-docbook.min.js')(Opal);

      if (loadExtensions)
        require('./asciidoctor-extensions.min.js')(Opal);

      return Opal.Asciidoctor;
    }
  }
}
