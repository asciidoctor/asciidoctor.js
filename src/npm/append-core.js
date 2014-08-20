      require('./asciidoctor-docbook.js')(Opal);

      if (loadExtensions)
        require('./asciidoctor-extensions.js')(Opal);

      return Opal.Asciidoctor;
    }
  }
}
