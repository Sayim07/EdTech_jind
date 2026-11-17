$source = "S:\sayim\Internship\EdTeach-jindal\CIM WEB"
$target = "S:\sayim\Internship\EdTeach-jindal\public\media"

if (-not (Test-Path $target)) {
    New-Item -ItemType Directory -Path $target -Force | Out-Null
}

$files = @(
    # Origin of Food
    @{ src = "$source\Origin of Food\Origin of Fire\The Spark of Humanity.mp4"; dst = "$target\spark-of-humanity.mp4" },
    @{ src = "$source\Origin of Food\Origin of Fire\Forged by Fire.pptx"; dst = "$target\forged-by-fire.pptx" },
    @{ src = "$source\Origin of Food\Origin of Fire\How Fire Reengineered Human  Anatomy.m4a"; dst = "$target\fire-reengineered-anatomy.m4a" },
    @{ src = "$source\Origin of Food\Origin of Fire\Fire and Human Evolution.png"; dst = "$target\fire-evolution.png" },

    @{ src = "$source\Origin of Food\Ancient Kitchen\Evolution of the Kitchen.mp4"; dst = "$target\kitchen-evolution.mp4" },
    @{ src = "$source\Origin of Food\Ancient Kitchen\Hearth to Heart.pptx"; dst = "$target\hearth-to-heart.pptx" },
    @{ src = "$source\Origin of Food\Ancient Kitchen\Half a million years of kitchen engineering.m4a"; dst = "$target\kitchen-engineering.m4a" },
    @{ src = "$source\Origin of Food\Ancient Kitchen\Evolution of the Human Kitchen.png"; dst = "$target\kitchen-evolution.png" },

    @{ src = "$source\Origin of Food\Animal Domestication\Animal Domestication.mp4"; dst = "$target\animal-domestication.mp4" },
    @{ src = "$source\Origin of Food\Animal Domestication\The Symbiotic Blueprint.pptx"; dst = "$target\symbiotic-blueprint.pptx" },
    @{ src = "$source\Origin of Food\Animal Domestication\How animals rewired human biology and history.m4a"; dst = "$target\animals-rewired-biology.m4a" },
    @{ src = "$source\Origin of Food\Animal Domestication\The Domestication Revolution nfographic.png"; dst = "$target\domestication-revolution.png" },

    @{ src = "$source\Origin of Food\Bread & Beer\Bread or Beer.mp4"; dst = "$target\bread-or-beer.mp4" },
    @{ src = "$source\Origin of Food\Bread & Beer\Elemental Alchemies.pptx"; dst = "$target\elemental-alchemies.pptx" },
    @{ src = "$source\Origin of Food\Bread & Beer\How Fire and Beer Built Humanity.m4a"; dst = "$target\fire-beer-humanity.m4a" },
    @{ src = "$source\Origin of Food\Bread & Beer\Roasting and Brewing Shaped Humanity.png"; dst = "$target\roasting-brewing.png" },

    @{ src = "$source\Origin of Food\Hunter Gatherer to Agriculture\Climate Birthed Agriculture.mp4"; dst = "$target\climate-birthed-agriculture.mp4" },
    @{ src = "$source\Origin of Food\Hunter Gatherer to Agriculture\Rethinking the Agriculture Revolution.pptx"; dst = "$target\rethinking-agriculture.pptx" },
    @{ src = "$source\Origin of Food\Hunter Gatherer to Agriculture\The biological trap of early farming.m4a"; dst = "$target\trap-early-farming.m4a" },
    @{ src = "$source\Origin of Food\Hunter Gatherer to Agriculture\The Paradox of Agricultural Transition.png"; dst = "$target\paradox-agriculture.png" },

    @{ src = "$source\Origin of Food\Origin of First Crop\Origin of First Crops.mp4"; dst = "$target\first-crops.mp4" },
    @{ src = "$source\Origin of Food\Origin of First Crop\The First Harvests.pptx"; dst = "$target\first-harvests.pptx" },
    @{ src = "$source\Origin of Food\Origin of First Crop\How wild weeds became our crops.m4a"; dst = "$target\wild-weeds-crops.m4a" },
    @{ src = "$source\Origin of Food\Origin of First Crop\Origin of Global Agriculture.png"; dst = "$target\global-agriculture.png" },

    # Ancient Civilizations & Their Food
    @{ src = "$source\Ancient Civilizations & Their Food\Mesopotamian cuisine\Tasting Ancient Mesopotamia.mp4"; dst = "$target\tasting-mesopotamia.mp4" },
    @{ src = "$source\Ancient Civilizations & Their Food\Mesopotamian cuisine\Table of Gods.pptx"; dst = "$target\table-of-gods.pptx" },
    @{ src = "$source\Ancient Civilizations & Their Food\Mesopotamian cuisine\What Ancient Mesopotamia Actually Tasted Like.m4a"; dst = "$target\mesopotamia-tasted-like.m4a" },
    @{ src = "$source\Ancient Civilizations & Their Food\Mesopotamian cuisine\Ancient Mesopotamian Culinary History Timeline.png"; dst = "$target\mesopotamian-timeline.png" },

    @{ src = "$source\Ancient Civilizations & Their Food\Egyptian bread and beer\Bread Beer Pyramids.mp4"; dst = "$target\egyptian-bread-beer-pyramids.mp4" },
    @{ src = "$source\Ancient Civilizations & Their Food\Egyptian bread and beer\Grain of Empire.pptx"; dst = "$target\grain-of-empire.pptx" },
    @{ src = "$source\Ancient Civilizations & Their Food\Egyptian bread and beer\Bread and beer powered the pyramids.m4a"; dst = "$target\bread-beer-pyramids.m4a" },
    @{ src = "$source\Ancient Civilizations & Their Food\Egyptian bread and beer\Ancient Egyptian Bread and Beer.png"; dst = "$target\egyptian-bread-beer.png" },

    @{ src = "$source\Ancient Civilizations & Their Food\Greek banquets\Dining in Ancient Greece.mp4"; dst = "$target\dining-ancient-greece.mp4" },
    @{ src = "$source\Ancient Civilizations & Their Food\Greek banquets\Soil to Symposium.pptx"; dst = "$target\soil-to-symposium.pptx" },
    @{ src = "$source\Ancient Civilizations & Their Food\Greek banquets\Pancakes, blood soup and the Symposium.m4a"; dst = "$target\pancakes-blood-soup-symposium.m4a" },
    @{ src = "$source\Ancient Civilizations & Their Food\Greek banquets\Ancient_Greek_Dining_and_Culture.png"; dst = "$target\greek-dining-culture.png" },

    @{ src = "$source\Ancient Civilizations & Their Food\Roman feasts\Lavish Roman Banquet.mp4"; dst = "$target\roman-banquet.mp4" },
    @{ src = "$source\Ancient Civilizations & Their Food\Roman feasts\The Roman Palate.pptx"; dst = "$target\roman-palate.pptx" },
    @{ src = "$source\Ancient Civilizations & Their Food\Roman feasts\Weaponized feasts and the chemistry of garum.m4a"; dst = "$target\weaponized-feasts-garum.m4a" },
    @{ src = "$source\Ancient Civilizations & Their Food\Roman feasts\Ancient Roman Power Dining Infographic.png"; dst = "$target\roman-power-dining.png" },

    @{ src = "$source\Ancient Civilizations & Their Food\Persian royal kitchens\The Explainer The Persian Recipe for Empire.mp4"; dst = "$target\persian-recipe-empire.mp4" },
    @{ src = "$source\Ancient Civilizations & Their Food\Persian royal kitchens\The Persian Synthesis.pptx"; dst = "$target\persian-synthesis.pptx" },
    @{ src = "$source\Ancient Civilizations & Their Food\Persian royal kitchens\How Royal Courts Invented Modern Flavor.m4a"; dst = "$target\royal-courts-flavor.m4a" },
    @{ src = "$source\Ancient Civilizations & Their Food\Persian royal kitchens\The Flavor of Persian Cuisine.png"; dst = "$target\flavor-persian-cuisine.png" },

    @{ src = "$source\Ancient Civilizations & Their Food\Chinese dynasties and food traditions\5,000_Years_of_Flavor.mp4"; dst = "$target\chinese-5000-years-flavor.mp4" },
    @{ src = "$source\Ancient Civilizations & Their Food\Chinese dynasties and food traditions\The Edible Empire.mp4"; dst = "$target\chinese-edible-empire.mp4" },
    @{ src = "$source\Ancient Civilizations & Their Food\Chinese dynasties and food traditions\Taxonomies of Taste The Geographic Matrix of Chinese Cuisine.mp4"; dst = "$target\chinese-taxonomies-taste.mp4" },
    @{ src = "$source\Ancient Civilizations & Their Food\Chinese dynasties and food traditions\The 30 Pillars of Chinese Cuisine.pptx"; dst = "$target\chinese-30-pillars.pptx" },
    @{ src = "$source\Ancient Civilizations & Their Food\Chinese dynasties and food traditions\The Wok and the Empire.pptx"; dst = "$target\chinese-wok-and-empire.pptx" },
    @{ src = "$source\Ancient Civilizations & Their Food\Chinese dynasties and food traditions\The History and Science of Chinese Cooking.m4a"; dst = "$target\chinese-history-science-cooking.m4a" },
    @{ src = "$source\Ancient Civilizations & Their Food\Chinese dynasties and food traditions\How Fuel Shortages Created Chinese Stir Fry.m4a"; dst = "$target\chinese-stir-fry-fuel.m4a" },
    @{ src = "$source\Ancient Civilizations & Their Food\Chinese dynasties and food traditions\How Imperial China Create Lions Head Meatballs.m4a"; dst = "$target\chinese-lions-head-meatballs.m4a" },
    @{ src = "$source\Ancient Civilizations & Their Food\Chinese dynasties and food traditions\30 Chinese Culinary Methods Infographic.png"; dst = "$target\chinese-culinary-methods.png" },
    @{ src = "$source\Ancient Civilizations & Their Food\Chinese dynasties and food traditions\Chinese Culinary Art History.png"; dst = "$target\chinese-art-history.png" },
    @{ src = "$source\Ancient Civilizations & Their Food\Chinese dynasties and food traditions\Evolution of Chinese Culinary Art.png"; dst = "$target\chinese-evolution-culinary.png" },
    @{ src = "$source\Ancient Civilizations & Their Food\Chinese dynasties and food traditions\Iconic Regional Dishes of China.png"; dst = "$target\chinese-regional-dishes.png" }
)

Write-Host "Copying $($files.Count) assets from CIM WEB to public\media..."
$copied = 0
foreach ($item in $files) {
    if (Test-Path $item.src) {
        Copy-Item -Path $item.src -Destination $item.dst -Force
        $copied++
    } else {
        Write-Warning "Source not found: $($item.src)"
    }
}

Write-Host "Finished copying $copied files out of $($files.Count) into $target"
