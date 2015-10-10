      require('./asciidoctor-docbook.min.js')(Opal);

      if (loadExtensions) {
        require('./asciidoctor-extensions.min.js')(Opal);
      }

      // By default automatically require Asciidoctor module unless variable AsciidoctorConfiguration.autoRequireModule is set to 'false'
      if (typeof AsciidoctorConfiguration === 'undefined' || typeof AsciidoctorConfiguration.autoRequireModule === 'undefined' || Boolean(AsciidoctorConfiguration.autoRequireModule)) {
        Opal.require('asciidoctor');
      }

      return Opal.Asciidoctor;
    }
  }
};
