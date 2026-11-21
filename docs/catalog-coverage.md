# Cobertura da biblioteca

## O que está incluído

- Mainline anual de 2017 a 2026 (4.284 registros).
- Porsche Series de 2015 (8 registros, série completa).
- Ferrari 599XX de 2015 em HW Workshop: Thrill Racers (regular CFH83 e Super Treasure Hunt CFJ39).

As adições de 2015 estão em `src/catalog-extra.json`, separadas da importação anual para que `npm run catalog:refresh` não as apague. São dados de lançamentos, sem fotos de terceiros.

## Coleções ainda sem importação sistemática

| Prioridade | Coleção | Situação e motivo |
|---|---|---|
| Alta | Mainline anterior a 2017, em especial 2010–2016 | A maior lacuna. Em 2015, HW City, HW Off-Road, HW Race e HW Workshop ainda não estão completos; a Ferrari 599XX é apenas uma amostra de HW Workshop. Anos anteriores têm outra divisão de séries. |
| Alta | Car Culture | Linha premium distinta da Mainline. Inclui séries temáticas e códigos de produto próprios. |
| Alta | Boulevard | Linha premium com muitas edições de carros colecionáveis; precisa de fonte por lançamento. |
| Média | Fast & Furious premium | Há várias ondas/temas; separar por ano e código evita misturar embalagens. |
| Média | Team Transport | Conjuntos de carro e transportador; o cadastro atual representa um carrinho por registro e precisa indicar o conjunto com clareza. |
| Média | Outros assortments temáticos | A Porsche Series de 2015 está completa, mas outras séries temáticas não foram importadas. |
| Posterior | Mystery Models, RLC e Collector Editions | Identificação e códigos variam; importar depois de definir dados mínimos verificáveis. |

**Critério para a próxima importação:** cada edição deve ter nome, código Mattel, ano da edição, série e fonte verificável. Cor e número da série entram quando a fonte distinguir a variante. A biblioteca não deve tratar todas as cores do mesmo casting como a mesma edição.

Fontes para planejar a expansão: [listas e séries da Hot Wheels Wiki](https://hotwheels.fandom.com/wiki/Chronological_List_of_Hot_Wheels_Series), [Porsche Series 2015](https://hotwheels.fandom.com/wiki/Porsche_Series_(2015)), [Ferrari 599XX](https://hotwheels.fandom.com/wiki/Ferrari_599XX), [Car Culture e Team Transport na Mattel](https://community.creations.mattel.com/news/hot-wheels/public-news-stories/2022-team-transport-keeps-the-race-cars-moving-r1949/).
