import Link from "next/link";

const section = "mt-12 first:mt-0";
const h2 = "text-xl font-semibold tracking-tight text-foreground";
const h3 = "mt-6 text-base font-semibold text-foreground/95";
const p = "mt-3 text-sm leading-relaxed text-muted-foreground";
const ul = "mt-3 list-disc space-y-1.5 pl-5 text-sm leading-relaxed text-muted-foreground";
const a = "text-primary underline-offset-2 transition hover:underline";

/** Wspólna polityka Sylveon Company — treść zsynchronizowana z sylveoncompany.pl/polityka-prywatnosci (2026-08-07). */
export function PrivacyPolicyContent() {
  return (
    <div className="legal-content">
      <section className={section}>
        <h2 className={h2}>1. Informacje ogólne</h2>
        <p className={p}>
          Niniejsza Polityka prywatności określa zasady przetwarzania i ochrony danych osobowych
          użytkowników serwisów prowadzonych przez Administratora, w szczególności:
        </p>
        <ul className={ul}>
          <li>
            strony firmowej <strong className="text-foreground/90">Sylveon Company</strong> dostępnej
            pod adresem{" "}
            <a className={a} href="https://sylveoncompany.pl/">
              sylveoncompany.pl
            </a>{" "}
            (oraz ewentualnymi aliasami produkcyjnymi tej samej usługi),
          </li>
          <li>
            serwisu <strong className="text-foreground/90">Sylveon Dart Profile</strong> dostępnego
            pod adresem{" "}
            <a className={a} href="https://dart.sylveoncompany.pl/">
              dart.sylveoncompany.pl
            </a>{" "}
            (oraz ewentualnymi aliasami produkcyjnymi tej samej usługi).
          </li>
          <li>
            i innych stron i serwisów osadzonych na domenie{" "}
            <a className={a} href="https://sylveoncompany.pl/">
              sylveoncompany.pl
            </a>
          </li>
        </ul>
        <p className={p}>
          Administratorem danych osobowych jest:
          <br />
          Piotr Grotkowski Sylveon Company prowadzący działalność o numerze NIP: 5242922935
          <br />
          dalej jako „Administrator”.
        </p>
        <p className={p}>
          W sprawach dotyczących ochrony danych osobowych można kontaktować się z Administratorem pod
          adresem:{" "}
          <a className={a} href="mailto:kontakt@sylveoncompany.pl">
            kontakt@sylveoncompany.pl
          </a>
          .
        </p>
      </section>

      <section className={section}>
        <h2 className={h2}>2. Czym są serwisy Administratora</h2>
        <h3 className={h3}>2.1. Strona firmowa Sylveon Company</h3>
        <p className={p}>
          Strona firmowa prezentuje działalność Sylveon Company i umożliwia kontakt z Administratorem,
          w szczególności za pośrednictwem adresu e-mail.
        </p>

        <h3 className={h3}>2.2. Sylveon Dart Profile</h3>
        <p className={p}>
          Sylveon Dart Profile jest serwisem umożliwiającym użytkownikowi stworzenie własnego profilu
          gracza darta oraz gromadzenie w jednym miejscu informacji i statystyk dotyczących jego gry.
        </p>
        <p className={p}>
          Użytkownik samodzielnie decyduje, jakie mecze, wyniki oraz inne dane dotyczące gry umieszcza
          w swoim profilu oraz z jakich obsługiwanych przez Serwis źródeł danych korzysta.
        </p>
        <p className={p}>
          Jednym z akceptowalnych źródeł danych meczowych jest serwis n01darts.com. Sylveon Company /
          Sylveon Dart Profile nie jest powiązany z n01darts.com, nie reprezentuje tego serwisu i nie
          odpowiada za zasady przetwarzania danych obowiązujące u tego podmiotu. Import danych z
          takiego źródła inicjuje użytkownik; wszystkie dane meczowe trafiające do profilu są podawane
          lub wybierane przez użytkownika.
        </p>
      </section>

      <section className={section}>
        <h2 className={h2}>3. Jakie dane mogą być przetwarzane</h2>
        <p className={p}>
          W zależności od sposobu korzystania z serwisów Administrator może przetwarzać w
          szczególności:
        </p>

        <h3 className={h3}>3.1. Dane związane z kontem użytkownika (Sylveon Dart Profile)</h3>
        <p className={p}>Mogą to być w szczególności:</p>
        <ul className={ul}>
          <li>adres e-mail,</li>
          <li>nazwa użytkownika lub pseudonim,</li>
          <li>identyfikator konta użytkownika,</li>
          <li>imię i nazwisko, jeżeli zostało udostępnione podczas rejestracji lub logowania,</li>
          <li>
            zdjęcie profilowe lub avatar, jeżeli zostały udostępnione przez użytkownika albo dostawcę
            logowania,
          </li>
          <li>informacje związane z datą utworzenia oraz korzystaniem z konta,</li>
          <li>
            dane dobrowolnie uzupełnione w profilu (np. miasto, preferencje sprzętowe, ustawienia
            widoczności),
          </li>
          <li>
            informacje o zgodzie na komunikację marketingową / newsletter, jeżeli została wyrażona.
          </li>
        </ul>

        <h3 className={h3}>3.2. Dane pozyskiwane podczas logowania przez Google</h3>
        <p className={p}>
          Jeżeli użytkownik wybierze możliwość logowania przy użyciu konta Google, Serwis może
          otrzymać od Google podstawowe dane niezbędne do uwierzytelnienia użytkownika, takie jak:
        </p>
        <ul className={ul}>
          <li>identyfikator konta Google,</li>
          <li>adres e-mail,</li>
          <li>imię i nazwisko lub nazwa profilu,</li>
          <li>zdjęcie profilowe, jeżeli jest dostępne.</li>
        </ul>
        <p className={p}>
          Serwis nie otrzymuje hasła użytkownika do konta Google. Zakres informacji przekazywanych
          przez Google zależy również od ustawień konta użytkownika oraz zakresu zgód udzielonych
          podczas logowania.
        </p>

        <h3 className={h3}>3.3. Dane związane z grą w darta</h3>
        <p className={p}>
          W ramach korzystania z Sylveon Dart Profile mogą być przetwarzane dane wprowadzone przez
          użytkownika lub przypisane do jego profilu, w szczególności:
        </p>
        <ul className={ul}>
          <li>wyniki rozegranych meczów,</li>
          <li>statystyki meczowe,</li>
          <li>średnie punktowe,</li>
          <li>liczba rzutów,</li>
          <li>informacje dotyczące turniejów, lig lub innych rozgrywek,</li>
          <li>dane pochodzące ze źródeł wskazanych lub wybranych przez użytkownika,</li>
          <li>inne dane statystyczne dotyczące gry w darta.</li>
        </ul>
        <p className={p}>
          <strong className="text-foreground/90">
            Wszystkie dane meczowe są podawane przez użytkownika
          </strong>{" "}
          (bezpośrednio albo poprzez wskazanie / import z obsługiwanego źródła). Zakres
          przechowywanych danych zależy od funkcji Serwisu oraz danych, które użytkownik zdecyduje się
          dodać do swojego profilu.
        </p>

        <h3 className={h3}>3.4. Dane kontaktowe (strona firmowa)</h3>
        <p className={p}>
          W przypadku kontaktu e-mailowego Administrator może przetwarzać adres e-mail, treść
          korespondencji oraz inne dane dobrowolnie podane w wiadomości.
        </p>

        <h3 className={h3}>3.5. Dane techniczne</h3>
        <p className={p}>
          Podczas korzystania z serwisów mogą być automatycznie przetwarzane informacje techniczne,
          takie jak:
        </p>
        <ul className={ul}>
          <li>adres IP,</li>
          <li>typ urządzenia,</li>
          <li>rodzaj i wersja przeglądarki,</li>
          <li>system operacyjny,</li>
          <li>data i godzina żądania,</li>
          <li>adres odwiedzanej podstrony,</li>
          <li>dane dotyczące błędów aplikacji,</li>
          <li>logi serwera,</li>
          <li>identyfikatory sesji,</li>
          <li>informacje dotyczące bezpieczeństwa i prawidłowego działania Serwisu.</li>
        </ul>

        <h3 className={h3}>3.6. Dane analityczne</h3>
        <p className={p}>
          Jeżeli użytkownik wyrazi zgodę na korzystanie z analitycznych plików cookies, serwisy mogą
          wykorzystywać Google Analytics.
        </p>
        <p className={p}>W związku z tym mogą być przetwarzane w szczególności informacje dotyczące:</p>
        <ul className={ul}>
          <li>odwiedzanych podstron,</li>
          <li>czasu korzystania z Serwisu,</li>
          <li>źródła wejścia do Serwisu,</li>
          <li>rodzaju urządzenia,</li>
          <li>przeglądarki,</li>
          <li>przybliżonych informacji o lokalizacji wynikających z danych technicznych,</li>
          <li>interakcji użytkownika z funkcjami Serwisu,</li>
          <li>identyfikatorów wykorzystywanych do rozróżniania użytkowników i sesji.</li>
        </ul>
        <p className={p}>
          Szczegółowe informacje dotyczące plików cookies wynikają z ustawień zgód dostępnych w
          Serwisie oraz z zasad Google Consent Mode / narzędzi Google do zarządzania zgodami.
        </p>

        <h3 className={h3}>3.7. Dane związane z płatnościami</h3>
        <p className={p}>
          Jeżeli użytkownik korzysta z płatnych funkcji Serwisu, przetwarzane mogą być dane niezbędne
          do realizacji płatności i rozliczeń, w szczególności identyfikatory transakcji, status
          płatności, kwota, data oraz dane rozliczeniowe przekazane przez operatora płatności. Dane
          kart płatniczych — jeżeli są wymagane — są przetwarzane przez operatora płatności, a nie
          przez Administratora, chyba że przepisy lub model integracji stanowią inaczej.
        </p>
      </section>

      <section className={section}>
        <h2 className={h2}>4. Cele i podstawy prawne przetwarzania danych</h2>
        <p className={p}>Dane osobowe mogą być przetwarzane w następujących celach:</p>

        <h3 className={h3}>4.1. Utworzenie i obsługa konta</h3>
        <p className={p}>Dane są przetwarzane w celu:</p>
        <ul className={ul}>
          <li>umożliwienia rejestracji,</li>
          <li>logowania użytkownika,</li>
          <li>utrzymywania konta,</li>
          <li>świadczenia funkcjonalności Sylveon Dart Profile,</li>
          <li>zapisywania i prezentowania statystyk użytkownika.</li>
        </ul>
        <p className={p}>
          Podstawą przetwarzania jest art. 6 ust. 1 lit. b RODO – przetwarzanie niezbędne do wykonania
          umowy o świadczenie usług drogą elektroniczną lub podjęcia działań przed jej zawarciem.
        </p>

        <h3 className={h3}>4.2. Logowanie przez Google</h3>
        <p className={p}>
          Dane otrzymane od Google są przetwarzane w celu uwierzytelnienia użytkownika i umożliwienia
          mu korzystania z konta w Serwisie. Podstawą przetwarzania jest art. 6 ust. 1 lit. b RODO.
        </p>

        <h3 className={h3}>4.3. Zapisywanie i przetwarzanie statystyk dartowych</h3>
        <p className={p}>
          Dane dotyczące rozgrywek i statystyk są przetwarzane w celu świadczenia głównej
          funkcjonalności Serwisu, tj. tworzenia profilu gracza i gromadzenia jego statystyk w jednym
          miejscu. Podstawą przetwarzania jest art. 6 ust. 1 lit. b RODO.
        </p>

        <h3 className={h3}>4.4. Kontakt ze stroną firmową</h3>
        <p className={p}>
          Dane z korespondencji są przetwarzane w celu odpowiedzi na zapytanie. Podstawą może być art.
          6 ust. 1 lit. b lub f RODO.
        </p>

        <h3 className={h3}>4.5. Zapewnienie bezpieczeństwa Serwisu</h3>
        <p className={p}>Dane techniczne i logi mogą być przetwarzane w celu:</p>
        <ul className={ul}>
          <li>zapewnienia bezpieczeństwa Serwisu,</li>
          <li>wykrywania błędów,</li>
          <li>ochrony przed nadużyciami,</li>
          <li>ochrony kont użytkowników,</li>
          <li>diagnozowania problemów technicznych.</li>
        </ul>
        <p className={p}>
          Podstawą przetwarzania jest art. 6 ust. 1 lit. f RODO – prawnie uzasadniony interes
          Administratora polegający na zapewnieniu bezpieczeństwa i prawidłowego działania Serwisu.
        </p>

        <h3 className={h3}>4.6. Dochodzenie i obrona przed roszczeniami</h3>
        <p className={p}>
          Dane mogą być przechowywane i wykorzystywane w zakresie niezbędnym do ustalenia,
          dochodzenia lub obrony przed roszczeniami. Podstawą przetwarzania jest art. 6 ust. 1 lit. f
          RODO.
        </p>

        <h3 className={h3}>4.7. Google Analytics</h3>
        <p className={p}>
          Dane analityczne są przetwarzane w celu analizy sposobu korzystania z Serwisu, mierzenia
          ruchu oraz poprawiania jego funkcjonalności. Google Analytics jest wykorzystywany po
          uzyskaniu odpowiedniej zgody użytkownika na analityczne pliki cookies lub podobne
          technologie. Podstawą przetwarzania jest art. 6 ust. 1 lit. a RODO – zgoda użytkownika.
          Zgoda może zostać wycofana w dowolnym momencie.
        </p>

        <h3 className={h3}>4.8. Płatności i rozliczenia</h3>
        <p className={p}>
          Dane związane z płatnościami są przetwarzane w celu realizacji zamówienia / abonamentu,
          potwierdzenia płatności oraz obsługi rozliczeń. Podstawą jest art. 6 ust. 1 lit. b RODO, a w
          zakresie obowiązków rachunkowych / podatkowych — art. 6 ust. 1 lit. c RODO.
        </p>

        <h3 className={h3}>4.9. Marketing / newsletter</h3>
        <p className={p}>
          Jeżeli użytkownik wyrazi zgodę, dane mogą być wykorzystywane do przesyłania informacji
          handlowych. Podstawą jest art. 6 ust. 1 lit. a RODO.
        </p>
      </section>

      <section className={section}>
        <h2 className={h2}>5. Google Analytics</h2>
        <p className={p}>
          Administrator korzysta lub może korzystać z usługi Google Analytics, dostarczanej przez
          Google. Google Analytics umożliwia tworzenie zbiorczych statystyk dotyczących korzystania z
          Serwisu i pomaga Administratorowi oceniać m.in.:
        </p>
        <ul className={ul}>
          <li>liczbę użytkowników,</li>
          <li>sposób poruszania się po Serwisie,</li>
          <li>popularność poszczególnych funkcji,</li>
          <li>źródła ruchu,</li>
          <li>rodzaje urządzeń wykorzystywanych do korzystania z Serwisu.</li>
        </ul>
        <p className={p}>
          Google Analytics może wykorzystywać pliki cookies i inne podobne identyfikatory. Analityczne
          pliki cookies nie powinny być zapisywane na urządzeniu użytkownika przed wyrażeniem przez
          niego odpowiedniej zgody.
        </p>
        <p className={p}>
          Użytkownik może w dowolnym momencie zmienić swoją decyzję dotyczącą analitycznych plików
          cookies za pomocą ustawień zgód dostępnych w Serwisie (w tym rozwiązań Google do zarządzania
          zgodami / Consent Mode).
        </p>
      </section>

      <section className={section}>
        <h2 className={h2}>6. Logowanie przy użyciu konta Google</h2>
        <p className={p}>
          Serwis Sylveon Dart Profile umożliwia logowanie za pomocą konta Google. Wybierając tę metodę
          logowania, użytkownik jest przekierowywany do usługi Google, gdzie następuje
          uwierzytelnienie.
        </p>
        <p className={p}>
          Google może przetwarzać dane użytkownika zgodnie z własnymi zasadami ochrony prywatności.
          Administrator otrzymuje wyłącznie informacje udostępnione przez Google w ramach
          zastosowanego mechanizmu uwierzytelniania i nie uzyskuje dostępu do hasła użytkownika do
          konta Google.
        </p>
        <p className={p}>
          Korzystanie z logowania Google jest dobrowolne, ale niezbędne celem korzystania z usług
          serwisu.
        </p>
      </section>

      <section className={section}>
        <h2 className={h2}>7. Dostawcy usług technologicznych</h2>
        <p className={p}>
          Serwisy korzystają z infrastruktury i usług dostawców technologicznych wspierających
          Administratora w prowadzeniu działalności online. W szczególności mogą to być dostawcy:
        </p>
        <ul className={ul}>
          <li>hostingu, CDN i infrastruktury aplikacyjnej,</li>
          <li>baz danych, pamięci masowej i uwierzytelniania,</li>
          <li>logowania zewnętrznego (np. Google),</li>
          <li>analityki (np. Google Analytics),</li>
          <li>operatorów płatności (np. PayNow, PayU lub inni wybrani operatorzy),</li>
          <li>usług informatycznych, bezpieczeństwa, prawnych lub księgowych.</li>
        </ul>
        <p className={p}>
          Dostawcy działają w zakresie niezbędnym do świadczenia swoich usług na rzecz Administratora.
          Relacje z podmiotami przetwarzającymi dane są regulowane odpowiednimi warunkami świadczenia
          usług oraz umowami dotyczącymi przetwarzania danych, jeżeli jest to wymagane przez przepisy
          prawa.
        </p>
      </section>

      <section className={section}>
        <h2 className={h2}>8. Odbiorcy danych</h2>
        <p className={p}>
          Dane osobowe mogą być przekazywane podmiotom wspierającym Administratora w prowadzeniu
          Serwisu wyłącznie w zakresie niezbędnym do realizacji określonych usług. Mogą to być w
          szczególności dostawcy wymienieni w pkt 7 oraz organy publiczne, jeżeli obowiązek taki
          wynika z przepisów prawa lub prawnie wiążącego żądania uprawnionego organu.
        </p>
        <p className={p}>Administrator nie sprzedaje danych osobowych użytkowników.</p>
      </section>

      <section className={section}>
        <h2 className={h2}>9. Przekazywanie danych poza Europejski Obszar Gospodarczy</h2>
        <p className={p}>
          Niektórzy dostawcy usług wykorzystywanych przez Serwis są podmiotami działającymi globalnie.
          W związku z korzystaniem z usług takich dostawców dane mogą w określonych przypadkach być
          przetwarzane poza Europejskim Obszarem Gospodarczym.
        </p>
        <p className={p}>
          Jeżeli dochodzi do takiego transferu, dane są przekazywane z wykorzystaniem mechanizmów
          przewidzianych przez RODO, takich jak:
        </p>
        <ul className={ul}>
          <li>decyzja Komisji Europejskiej stwierdzająca odpowiedni stopień ochrony,</li>
          <li>standardowe klauzule umowne zatwierdzone przez Komisję Europejską,</li>
          <li>inne dopuszczalne prawem zabezpieczenia.</li>
        </ul>
      </section>

      <section className={section}>
        <h2 className={h2}>10. Okres przechowywania danych</h2>
        <p className={p}>
          Dane związane z kontem użytkownika oraz jego profilem przechowywane są zasadniczo przez
          okres posiadania aktywnego konta w Sylveon Dart Profile.
        </p>
        <p className={p}>
          Po usunięciu konta dane zostaną usunięte lub zanonimizowane, chyba że ich dalsze
          przechowywanie jest:
        </p>
        <ul className={ul}>
          <li>wymagane przez obowiązujące przepisy prawa,</li>
          <li>konieczne do ustalenia, dochodzenia lub obrony przed roszczeniami,</li>
          <li>
            czasowo konieczne ze względu na funkcjonowanie kopii bezpieczeństwa lub infrastruktury
            technicznej.
          </li>
        </ul>
        <p className={p}>
          Dane techniczne i logi przechowywane są przez okres niezbędny do zapewnienia bezpieczeństwa
          i prawidłowego funkcjonowania Serwisu.
        </p>
        <p className={p}>
          Dane przetwarzane na podstawie zgody są przetwarzane do momentu jej wycofania, chyba że
          wcześniej przestanie istnieć cel ich przetwarzania.
        </p>
        <p className={p}>
          Dane Google Analytics przechowywane są zgodnie z okresem retencji skonfigurowanym przez
          Administratora w ustawieniach Google Analytics.
        </p>
        <p className={p}>
          Dane związane z płatnościami i rozliczeniami przechowywane są przez okres wymagany
          przepisami prawa oraz przez czas niezbędny do obsługi reklamacji i roszczeń.
        </p>
      </section>

      <section className={section}>
        <h2 className={h2}>11. Usunięcie konta</h2>
        <p className={p}>
          Użytkownik może zażądać usunięcia swojego konta oraz danych powiązanych z kontem.
        </p>
        <p className={p}>
          Jeżeli funkcja samodzielnego usunięcia konta jest dostępna w ustawieniach Sylveon Dart
          Profile, użytkownik może skorzystać z tej funkcji. W przeciwnym razie żądanie usunięcia
          konta można przesłać na adres:{" "}
          <a className={a} href="mailto:kontakt@sylveoncompany.pl">
            kontakt@sylveoncompany.pl
          </a>
          .
        </p>
        <p className={p}>
          Usunięcie konta nie musi oznaczać natychmiastowego usunięcia wszystkich danych z kopii
          bezpieczeństwa. Dane znajdujące się w kopiach bezpieczeństwa zostaną usunięte zgodnie z
          cyklem ich przechowywania, o ile nie istnieje obowiązek ich dalszego przechowywania.
        </p>
      </section>

      <section className={section}>
        <h2 className={h2}>12. Dobrowolność podania danych</h2>
        <p className={p}>
          Podanie danych wymaganych do utworzenia konta jest dobrowolne, ale konieczne do korzystania
          z funkcjonalności wymagających posiadania konta.
        </p>
        <p className={p}>
          Dodawanie danych dotyczących poszczególnych rozgrywek i statystyk jest dobrowolne.
          Użytkownik sam decyduje, jakie obsługiwane przez Serwis dane dotyczące swojej gry przypisuje
          do profilu.
        </p>
      </section>

      <section className={section}>
        <h2 className={h2}>13. Dane dotyczące innych osób</h2>
        <p className={p}>
          Użytkownik powinien unikać wprowadzania do Serwisu danych osobowych innych osób, które nie
          są konieczne do prowadzenia statystyk jego gry.
        </p>
        <p className={p}>
          Jeżeli informacje o meczu obejmują np. nazwę lub pseudonim przeciwnika, użytkownik powinien
          korzystać z takich danych wyłącznie w zakresie uzasadnionym dokumentowaniem przebiegu
          rozgrywki i zgodnym z obowiązującymi przepisami. Dane o przeciwnikach pochodzą z informacji
          podanych lub zaimportowanych przez użytkownika.
        </p>
      </section>

      <section className={section}>
        <h2 className={h2}>14. Prawa użytkownika</h2>
        <p className={p}>W zakresie przewidzianym przez RODO użytkownikowi przysługuje:</p>
        <ul className={ul}>
          <li>prawo dostępu do swoich danych,</li>
          <li>prawo otrzymania kopii danych,</li>
          <li>prawo sprostowania danych,</li>
          <li>prawo żądania usunięcia danych,</li>
          <li>prawo ograniczenia przetwarzania,</li>
          <li>prawo do przenoszenia danych,</li>
          <li>
            prawo wniesienia sprzeciwu wobec przetwarzania danych opartego na prawnie uzasadnionym
            interesie Administratora,
          </li>
          <li>
            prawo wycofania zgody w dowolnym momencie, jeżeli przetwarzanie odbywa się na podstawie
            zgody.
          </li>
        </ul>
        <p className={p}>
          Wycofanie zgody nie wpływa na zgodność z prawem przetwarzania dokonanego przed jej
          wycofaniem. W celu realizacji swoich praw użytkownik może skontaktować się z Administratorem
          pod adresem:{" "}
          <a className={a} href="mailto:kontakt@sylveoncompany.pl">
            kontakt@sylveoncompany.pl
          </a>
          .
        </p>
      </section>

      <section className={section}>
        <h2 className={h2}>15. Prawo wniesienia skargi</h2>
        <p className={p}>
          Jeżeli użytkownik uważa, że jego dane są przetwarzane niezgodnie z obowiązującymi
          przepisami, ma prawo złożyć skargę do organu nadzorczego właściwego w sprawach ochrony
          danych osobowych. W Polsce organem tym jest Prezes Urzędu Ochrony Danych Osobowych.
        </p>
      </section>

      <section className={section}>
        <h2 className={h2}>16. Zautomatyzowane podejmowanie decyzji</h2>
        <p className={p}>
          Administrator nie wykorzystuje danych osobowych użytkowników do podejmowania wobec nich
          decyzji wywołujących skutki prawne lub w podobny sposób istotnie na nich wpływających
          wyłącznie na podstawie zautomatyzowanego przetwarzania.
        </p>
        <p className={p}>
          Statystyki generowane przez Sylveon Dart Profile dotyczą gry użytkownika i nie stanowią
          zautomatyzowanego podejmowania decyzji w rozumieniu art. 22 RODO.
        </p>
      </section>

      <section className={section}>
        <h2 className={h2}>17. Bezpieczeństwo danych</h2>
        <p className={p}>
          Administrator stosuje odpowiednie środki techniczne i organizacyjne mające na celu ochronę
          danych przed:
        </p>
        <ul className={ul}>
          <li>nieuprawnionym dostępem,</li>
          <li>nieuprawnioną zmianą,</li>
          <li>utratą,</li>
          <li>zniszczeniem,</li>
          <li>ujawnieniem osobom nieuprawnionym.</li>
        </ul>
        <p className={p}>
          Dostęp do danych powinien być ograniczony do osób i podmiotów, które potrzebują go w celu
          świadczenia lub utrzymania Serwisu.
        </p>
      </section>

      <section className={section}>
        <h2 className={h2}>18. Linki do zewnętrznych serwisów</h2>
        <p className={p}>
          Serwisy Administratora mogą zawierać odnośniki do serwisów należących do podmiotów trzecich,
          w tym do źródeł danych meczowych takich jak n01darts.com. Administrator nie odpowiada za
          zasady przetwarzania danych obowiązujące w zewnętrznych serwisach. Po przejściu do
          zewnętrznego serwisu użytkownik powinien zapoznać się z jego zasadami ochrony prywatności.
        </p>
      </section>

      <section className={section}>
        <h2 className={h2}>19. Zmiany Polityki prywatności</h2>
        <p className={p}>Polityka prywatności może być aktualizowana w szczególności w przypadku:</p>
        <ul className={ul}>
          <li>zmiany funkcjonalności Serwisów,</li>
          <li>zmiany dostawców technologicznych,</li>
          <li>zmiany zakresu przetwarzanych danych,</li>
          <li>zmiany obowiązujących przepisów.</li>
        </ul>
        <p className={p}>
          Aktualna wersja Polityki prywatności jest dostępna pod adresem{" "}
          <Link className={a} href="/polityka-prywatnosci">
            dart.sylveoncompany.pl/polityka-prywatnosci
          </Link>{" "}
          (alias:{" "}
          <Link className={a} href="/privacy">
            /privacy
          </Link>
          ).
        </p>
        <p className={p}>
          W przypadku istotnych zmian Administrator może dodatkowo poinformować o nich użytkowników w
          odpowiedni sposób.
        </p>
      </section>

      <section className={section}>
        <h2 className={h2}>20. Kontakt</h2>
        <p className={p}>
          W przypadku pytań dotyczących prywatności, przetwarzania danych osobowych lub realizacji
          praw wynikających z RODO należy skontaktować się z Administratorem: Piotr Grotkowski Sylveon
          Company
          <br />
          e-mail:{" "}
          <a className={a} href="mailto:kontakt@sylveoncompany.pl">
            kontakt@sylveoncompany.pl
          </a>
        </p>
      </section>
    </div>
  );
}
