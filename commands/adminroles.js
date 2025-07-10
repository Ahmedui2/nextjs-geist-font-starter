const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, StringSelectMenuBuilder } = require('discord.js');

const name = 'adminroles';

async function execute(message, args, { ADMIN_ROLES, saveData, BOT_OWNERS, client }) {
  if (!BOT_OWNERS.includes(message.author.id)) {
    return message.reply('**هذا الأمر مخصص لمالكي البوت فقط!**');
  }

  // Create main menu embed
  const embed = new EmbedBuilder()
    .setTitle('🛡️ إدارة رولات المشرفين')
    .setDescription(`**الرولات الحالية:**\n${ADMIN_ROLES.length > 0 ? ADMIN_ROLES.map(r => `<@&${r}>`).join('\n') : 'لا يوجد رولات محددة'}`)
    .setColor('#0099ff')
    .setFooter({ text: 'اختر العملية المطلوبة' });

  // Create buttons
  const addButton = new ButtonBuilder()
    .setCustomId('adminroles_add')
    .setLabel('إضافة رولات')
    .setStyle(ButtonStyle.Success)
    .setEmoji('➕');

  const removeButton = new ButtonBuilder()
    .setCustomId('adminroles_remove')
    .setLabel('إزالة رولات')
    .setStyle(ButtonStyle.Danger)
    .setEmoji('➖');

  const listButton = new ButtonBuilder()
    .setCustomId('adminroles_list')
    .setLabel('عرض القائمة')
    .setStyle(ButtonStyle.Secondary)
    .setEmoji('📋');

  const row = new ActionRowBuilder().addComponents(addButton, removeButton, listButton);

  const sentMessage = await message.channel.send({ embeds: [embed], components: [row] });

  // Create collector for buttons
  const filter = i => i.user.id === message.author.id && i.message.id === sentMessage.id;
  const collector = message.channel.createMessageComponentCollector({ filter, time: 300000 });

  collector.on('collect', async interaction => {
    try {
      if (interaction.customId === 'adminroles_add') {
        // Send message asking for roles
        await interaction.reply({ 
          content: '**أرسل معرفات الرولات أو المنشن (مفصولة بمسافات):**\nمثال: `123456789 987654321` أو `@role1 @role2`', 
          flags: 64 
        });

        // Create message collector
        const messageFilter = m => m.author.id === interaction.user.id;
        const messageCollector = interaction.channel.createMessageCollector({ 
          filter: messageFilter, 
          time: 60000, 
          max: 1 
        });

        messageCollector.on('collect', async (msg) => {
          try {
            await msg.delete().catch(() => {});
            
            const rolesInput = msg.content.trim();
            const roleIds = rolesInput.split(/\s+/).map(role => role.replace(/[<@&>]/g, '')).filter(id => id);

            if (roleIds.length === 0) {
              return interaction.followUp({ content: '**لم يتم تحديد أي رولات صحيحة.**', flags: 64 });
            }

            let addedRoles = [];
            let existingRoles = [];
            let invalidRoles = [];

            for (const roleId of roleIds) {
              if (ADMIN_ROLES.includes(roleId)) {
                existingRoles.push(roleId);
              } else {
                try {
                  const role = await interaction.guild.roles.fetch(roleId);
                  if (role) {
                    ADMIN_ROLES.push(roleId);
                    addedRoles.push(roleId);
                  } else {
                    invalidRoles.push(roleId);
                  }
                } catch (error) {
                  invalidRoles.push(roleId);
                }
              }
            }

            saveData();

            let response = '';
            if (addedRoles.length > 0) {
              response += `**تمت إضافة الرولات:**\n${addedRoles.map(id => `<@&${id}>`).join('\n')}\n\n`;
            }
            if (existingRoles.length > 0) {
              response += `**الرولات الموجودة مسبقاً:**\n${existingRoles.map(id => `<@&${id}>`).join('\n')}\n\n`;
            }
            if (invalidRoles.length > 0) {
              response += `**رولات غير صحيحة:**\n${invalidRoles.join(', ')}\n\n`;
            }

            await interaction.followUp({ content: response || '**لم يتم إجراء أي تغييرات.**', flags: 64 });

            // Update main menu
            const newEmbed = new EmbedBuilder()
              .setTitle('🛡️ إدارة رولات المشرفين')
              .setDescription(`**الرولات الحالية:**\n${ADMIN_ROLES.length > 0 ? ADMIN_ROLES.map(r => `<@&${r}>`).join('\n') : 'لا يوجد رولات محددة'}`)
              .setColor('#0099ff')
              .setFooter({ text: 'اختر العملية المطلوبة' });

            await sentMessage.edit({ embeds: [newEmbed], components: [row] });
          } catch (error) {
            console.error('Error processing roles:', error);
            await interaction.followUp({ content: '**حدث خطأ أثناء معالجة الرولات.**', flags: 64 });
          }
        });

        messageCollector.on('end', (collected) => {
          if (collected.size === 0) {
            interaction.followUp({ content: '**انتهت مهلة الانتظار.**', flags: 64 }).catch(() => {});
          }
        });

      } else if (interaction.customId === 'adminroles_remove') {
        if (ADMIN_ROLES.length === 0) {
          return interaction.reply({ content: '**لا توجد رولات لإزالتها.**', flags: 64 });
        }

        // Send message asking for roles
        await interaction.reply({ 
          content: '**أرسل معرفات الرولات أو المنشن (مفصولة بمسافات):**\nمثال: `123456789 987654321` أو `@role1 @role2`', 
          flags: 64 
        });

        // Create message collector
        const messageFilter = m => m.author.id === interaction.user.id;
        const messageCollector = interaction.channel.createMessageCollector({ 
          filter: messageFilter, 
          time: 60000, 
          max: 1 
        });

        messageCollector.on('collect', async (msg) => {
          try {
            await msg.delete().catch(() => {});
            
            const rolesInput = msg.content.trim();
            const roleIds = rolesInput.split(/\s+/).map(role => role.replace(/[<@&>]/g, '')).filter(id => id);

            if (roleIds.length === 0) {
              return interaction.followUp({ content: '**لم يتم تحديد أي رولات صحيحة.**', flags: 64 });
            }

            let removedRoles = [];
            let notFoundRoles = [];

            for (const roleId of roleIds) {
              const index = ADMIN_ROLES.indexOf(roleId);
              if (index !== -1) {
                ADMIN_ROLES.splice(index, 1);
                removedRoles.push(roleId);
              } else {
                notFoundRoles.push(roleId);
              }
            }

            saveData();

            let response = '';
            if (removedRoles.length > 0) {
              response += `**تمت إزالة الرولات:**\n${removedRoles.map(id => `<@&${id}>`).join('\n')}\n\n`;
            }
            if (notFoundRoles.length > 0) {
              response += `**رولات غير موجودة في القائمة:**\n${notFoundRoles.map(id => `<@&${id}>`).join('\n')}\n\n`;
            }

            await interaction.followUp({ content: response || '**لم يتم إجراء أي تغييرات.**', flags: 64 });

            // Update main menu
            const newEmbed = new EmbedBuilder()
              .setTitle('🛡️ إدارة رولات المشرفين')
              .setDescription(`**الرولات الحالية:**\n${ADMIN_ROLES.length > 0 ? ADMIN_ROLES.map(r => `<@&${r}>`).join('\n') : 'لا يوجد رولات محددة'}`)
              .setColor('#0099ff')
              .setFooter({ text: 'اختر العملية المطلوبة' });

            await sentMessage.edit({ embeds: [newEmbed], components: [row] });
          } catch (error) {
            console.error('Error processing roles:', error);
            await interaction.followUp({ content: '**حدث خطأ أثناء معالجة الرولات.**', flags: 64 });
          }
        });

        messageCollector.on('end', (collected) => {
          if (collected.size === 0) {
            interaction.followUp({ content: '**انتهت مهلة الانتظار.**', flags: 64 }).catch(() => {});
          }
        });

      } else if (interaction.customId === 'adminroles_list') {
        if (ADMIN_ROLES.length === 0) {
          return interaction.reply({ content: '**لا توجد رولات محددة حالياً**', flags: 64 });
        }

        // Create select menu with roles
        const roleOptions = [];
        for (const roleId of ADMIN_ROLES) {
          try {
            const role = await message.guild.roles.fetch(roleId);
            roleOptions.push({
              label: role ? role.name : `رول محذوف (${roleId})`,
              value: roleId,
              description: role ? `معرف: ${roleId}` : 'رول غير موجود'
            });
          } catch (error) {
            roleOptions.push({
              label: `رول غير موجود (${roleId})`,
              value: roleId,
              description: 'رول غير موجود'
            });
          }
        }

        const roleSelectMenu = new StringSelectMenuBuilder()
          .setCustomId('adminroles_select_role')
          .setPlaceholder('اختر رول لعرض الأعضاء')
          .addOptions(roleOptions.slice(0, 25)); // Discord limit

        const selectRow = new ActionRowBuilder().addComponents(roleSelectMenu);

        // Back button
        const backButton = new ButtonBuilder()
          .setCustomId('adminroles_back')
          .setLabel('العودة للقائمة الرئيسية')
          .setStyle(ButtonStyle.Primary)
          .setEmoji('🔙');

        const backRow = new ActionRowBuilder().addComponents(backButton);

        const listEmbed = new EmbedBuilder()
          .setTitle('📋 اختر رول لعرض الأعضاء')
          .setDescription(`**عدد الرولات:** ${ADMIN_ROLES.length}`)
          .setColor('#0099ff');

        await interaction.update({ embeds: [listEmbed], components: [selectRow, backRow] });

      } else if (interaction.customId === 'adminroles_select_role') {
        const selectedRoleId = interaction.values[0];
        
        try {
          const role = await message.guild.roles.fetch(selectedRoleId);
          if (!role) {
            return interaction.reply({ content: '**هذا الرول غير موجود.**', flags: 64 });
          }

          const members = role.members.map(member => member.displayName || member.user.username);
          
          const memberEmbed = new EmbedBuilder()
            .setTitle(`👥 أعضاء رول: ${role.name}`)
            .setDescription(members.length > 0 ? members.join('\n') : '**لا يوجد أعضاء في هذا الرول**')
            .setColor(role.color || '#0099ff')
            .setFooter({ text: `عدد الأعضاء: ${members.length}` });

          // Back to roles list button
          const backToListButton = new ButtonBuilder()
            .setCustomId('adminroles_list')
            .setLabel('العودة لقائمة الرولات')
            .setStyle(ButtonStyle.Secondary)
            .setEmoji('📋');

          // Back to main menu button
          const backToMainButton = new ButtonBuilder()
            .setCustomId('adminroles_back')
            .setLabel('القائمة الرئيسية')
            .setStyle(ButtonStyle.Primary)
            .setEmoji('🔙');

          const buttonRow = new ActionRowBuilder().addComponents(backToListButton, backToMainButton);

          await interaction.update({ embeds: [memberEmbed], components: [buttonRow] });
        } catch (error) {
          await interaction.reply({ content: '**حدث خطأ أثناء جلب معلومات الرول.**', flags: 64 });
        }

      } else if (interaction.customId === 'adminroles_back') {
        // Return to main menu
        const newEmbed = new EmbedBuilder()
          .setTitle('🛡️ إدارة رولات المشرفين')
          .setDescription(`**الرولات الحالية:**\n${ADMIN_ROLES.length > 0 ? ADMIN_ROLES.map(r => `<@&${r}>`).join('\n') : 'لا يوجد رولات محددة'}`)
          .setColor('#0099ff')
          .setFooter({ text: 'اختر العملية المطلوبة' });

        await interaction.update({ embeds: [newEmbed], components: [row] });
      }
    } catch (error) {
      console.error('Error in adminroles collector:', error);
      try {
        if (!interaction.replied && !interaction.deferred) {
          await interaction.reply({ content: '**حدث خطأ أثناء معالجة الطلب.**', flags: 64 });
        }
      } catch (replyError) {
        console.error('Failed to send error reply:', replyError);
      }
    }
  });

  collector.on('end', () => {
    // Disable buttons when collector ends
    const disabledRow = new ActionRowBuilder().addComponents(
      addButton.setDisabled(true),
      removeButton.setDisabled(true),
      listButton.setDisabled(true)
    );
    sentMessage.edit({ components: [disabledRow] }).catch(console.error);
  });
}

module.exports = { name, execute };