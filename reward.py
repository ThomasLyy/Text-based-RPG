from equipment import EquipmentType, Equipment, WeaponSubType, ArmorSubType
from consumable import Consumable
from rich import print
from rich.panel import Panel
from rich.prompt import Prompt

def getRewardForFloor(floor):
    # Logique pour déterminer les récompenses en fonction de l'étage
    if floor == 1:
        return [
            Equipment("Sharp Dagger", EquipmentType.WEAPON, subType=WeaponSubType.SWORD, tier=1, value=15, strengthBonus=4),
            Consumable("Small Health Potion", EquipmentType.CONSUMABLE, None, 1, 20, healthRecovery=30),
        ]
    elif floor == 2:
        return [
            Equipment("Sturdy Shield", EquipmentType.ARMOR, subType=ArmorSubType.OFF_HAND, tier=1, value=20, healthBonus=10),
            Consumable("Small Mana Potion", EquipmentType.CONSUMABLE, None, 1, 25, manaRecovery=20),
        ]
    elif floor == 3:
        return [
            Equipment("Iron Helmet", EquipmentType.ARMOR, subType=ArmorSubType.HEAD, tier=2, value=30, healthBonus=15),
            Equipment("Enchanted Ring", EquipmentType.ARMOR, subType=ArmorSubType.RING, tier=2, value=35, manaBonus=12),
        ]
    elif floor == 4:
        return [
            Equipment("Steel Breastplate", EquipmentType.ARMOR, subType=ArmorSubType.CHEST, tier=2, value=40, strengthBonus=6, healthBonus=20),
            Consumable("Medium Health Potion", EquipmentType.CONSUMABLE, None, 2, 35, healthRecovery=50),
        ]

def chooseReward(player, floor):
    available_rewards = getRewardForFloor(floor)
    if not available_rewards:  # Gérer le cas où il n'y a pas de récompenses
        print("There are no rewards available on this floor.")
        return  # Quitter la fonction si aucune récompense n'est trouvée

    print(Panel("[bold blue]Choose your reward:[/bold blue]"))

    for i, reward in enumerate(available_rewards):
        print(f"{i+1}. {reward}")

    choice = Prompt.ask("Enter your choice (by number)")
    while not choice.isdigit() or not (1 <= int(choice) <= len(available_rewards)):
        print("Invalid choice.")
        choice = Prompt.ask("Enter your choice (by number)")

    chosen_reward = available_rewards[int(choice) - 1]
    if chosen_reward.equipmentType == EquipmentType.CONSUMABLE:
        player.consumables.append(chosen_reward)
    else:
        player.equip(chosen_reward)
