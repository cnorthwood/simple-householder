export function Footer() {
  const offline = location.protocol === 'file:';
  return (
    <footer class="site-footer">
      <div class="container">
        <p>
          <strong>Your data stays on your computer.</strong> Simple Householder runs entirely in
          your browser. This page is blocked from sending data anywhere.
          {!offline && (
            <>
              {' '}
              You can also{' '}
              <a href="simple-householder.html" download>
                download it to use offline
              </a>
              .
            </>
          )}
        </p>
        <p>
          Built by volunteers for Liberal Democrat campaigners. Free software under the{' '}
          <a href="https://github.com/cnorthwood/simple-householder">GNU AGPL (source code)</a>.
          Passwords use the <a href="https://www.eff.org/dice">EFF Large Wordlist</a> (CC BY 3.0
          US). Typeset in Open Sans (SIL Open Font License).
        </p>
      </div>
    </footer>
  );
}
